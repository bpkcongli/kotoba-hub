import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  contextSchema,
  difficultySchema,
  generatedPracticeSchema,
  gradedAnswerSchema,
  placementSchema,
  recommendationSchema,
} from '@/backend/shared/application/helpers/ai-schemas';
import { aiInstructions } from '@/backend/shared/application/helpers/ai-templates';
import type { AiProviderPort, AiUsage } from '@/backend/shared/application/ports/ai-provider.port';
import type { AiService } from '@/backend/shared/application/services/ai.service';
import type {
  AiContextBundle,
  AiOperation,
  AiRequestBase,
  AiRuntimeConfig,
  GeneratePracticeSessionInput,
  GenerateStudyRecommendationInput,
  GradePracticeAnswerInput,
  SummarizePlacementInput,
} from '@/backend/shared/application/services/requests/ai-request';
import type {
  GeneratedPracticeSession,
  GradedPracticeAnswer,
  PlacementSummary,
  StudyRecommendation,
} from '@/backend/shared/application/services/responses/ai-response';
import { AiFailure } from '@/backend/shared/domain/exceptions/ai-failure';
import type {
  AiAttemptLog,
  AiRequestLogRepository,
} from '@/backend/shared/domain/repositories/ai-request-log.repository';

const metadataSchema = z.strictObject({
  requestId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  sourceEntityType: z
    .enum(['PRACTICE_SESSION', 'PRACTICE_ANSWER', 'PERSONALIZATION_ASSESSMENT'])
    .optional(),
  sourceEntityId: z.string().uuid().optional(),
});

const gradeInputSchema = z.strictObject({
  question: z.strictObject({
    skillCode: z.string().min(1).max(2000),
    questionType: z.literal('FREE_RESPONSE'),
    sourceSentence: z.string().min(1).max(2000),
    referenceAnswer: z.string().min(1).max(2000),
  }),
  userAnswer: z.strictObject({
    rawInputRomaji: z.string().max(2000),
    normalizedKana: z.string().min(1).max(2000),
    normalizedKanji: z.string().max(2000).nullable(),
  }),
});

export class AiServiceImpl implements AiService {
  constructor(
    private readonly provider: AiProviderPort,
    private readonly logs: AiRequestLogRepository,
    private readonly config: AiRuntimeConfig,
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {}

  async generatePracticeSession(
    input: GeneratePracticeSessionInput,
  ): Promise<GeneratedPracticeSession> {
    const parameters = z
      .strictObject({
        questionCount: z.number().int().min(1).max(20),
        difficultyBand: difficultySchema,
        questionMix: z
          .strictObject({
            WEAK: z.number().min(0).max(1),
            REINFORCEMENT: z.number().min(0).max(1),
            STRETCH: z.number().min(0).max(1),
          })
          .refine((mix) => Math.abs(mix.WEAK + mix.REINFORCEMENT + mix.STRETCH - 1) < 0.000001),
      })
      .safeParse({
        questionCount: input.questionCount,
        difficultyBand: input.difficultyBand,
        questionMix: input.questionMix ?? { WEAK: 0.6, REINFORCEMENT: 0.3, STRETCH: 0.1 },
      });

    if (!parameters.success) throw new AiFailure('INVALID_INPUT');

    return this.execute(
      'GENERATE_PRACTICE_SESSION',
      input,
      parameters.data,
      generatedPracticeSchema,
      (output, context) => {
        if (output.questions.length !== parameters.data.questionCount) return false;

        const allowed = context.allowedQuestionTypes.length
          ? context.allowedQuestionTypes
          : ['SHORT_FREE_RESPONSE'];

        return output.questions.every(
          (question) =>
            context.catalog.some((skill) => skill.skillCode === question.skillCode) &&
            allowed.includes(question.questionType) &&
            question.difficultyBand === parameters.data.difficultyBand &&
            this.validQuestion(question),
        );
      },
    );
  }

  async gradePracticeAnswer(input: GradePracticeAnswerInput): Promise<GradedPracticeAnswer> {
    const parameters = gradeInputSchema.safeParse({
      question: input.question,
      userAnswer: input.userAnswer,
    });

    if (
      !parameters.success ||
      !this.context(input).catalog.some(
        (skill) => skill.skillCode === parameters.data.question.skillCode,
      )
    )
      throw new AiFailure('INVALID_INPUT');

    return this.execute(
      'GRADE_PRACTICE_ANSWER',
      input,
      parameters.data,
      gradedAnswerSchema,
      () => true,
    );
  }

  async summarizePlacement(input: SummarizePlacementInput): Promise<PlacementSummary> {
    const note = z.string().trim().min(1).max(5000).safeParse(input.note);
    if (!note.success) throw new AiFailure('INVALID_INPUT');

    return this.execute(
      'SUMMARIZE_PLACEMENT',
      input,
      { note: note.data },
      placementSchema,
      (output, context) => {
        const codes = output.suggestedKnownSkillClaims.map((claim) => claim.skillCode);

        return (
          new Set(codes).size === codes.length &&
          codes.every((code) => context.catalog.some((skill) => skill.skillCode === code))
        );
      },
    );
  }

  async generateStudyRecommendation(
    input: GenerateStudyRecommendationInput,
  ): Promise<StudyRecommendation> {
    return this.execute(
      'GENERATE_STUDY_RECOMMENDATION',
      input,
      {},
      recommendationSchema,
      (output, context) => {
        const skills = context.catalog.filter(
          (skill) =>
            skill.lessonSlug === output.nextLessonSlug &&
            skill.unitSlug === output.recommendedUnitSlug &&
            skill.trackSlug === output.recommendedTrackSlug,
        );
        const allowed = context.allowedQuestionTypes.length
          ? context.allowedQuestionTypes
          : ['SHORT_FREE_RESPONSE'];

        return (
          skills.length > 0 &&
          new Set(output.targetSkillCodes).size === output.targetSkillCodes.length &&
          output.targetSkillCodes.every((code) =>
            skills.some((skill) => skill.skillCode === code),
          ) &&
          new Set(output.allowedQuestionTypes).size === output.allowedQuestionTypes.length &&
          output.allowedQuestionTypes.every((type) => allowed.includes(type))
        );
      },
    );
  }

  private validQuestion(question: GeneratedPracticeSession['questions'][number]): boolean {
    const japanese = (text: string) =>
      /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text) && !/[<>]/u.test(text);

    const english = (text: string) =>
      /[a-z]/iu.test(text) &&
      !/[\r\n]|[.!?]\s+\S/u.test(text) &&
      !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}<>]/u.test(text);

    if (question.questionType === 'SHORT_FREE_RESPONSE' || question.questionType === 'SLOT_FILL') {
      if (
        (question.promptPayload.sentenceTemplate.match(/___/g) ?? []).length !== 1 ||
        !japanese(question.promptPayload.sentenceTemplate)
      )
        return false;

      if (question.questionType === 'SHORT_FREE_RESPONSE')
        return question.expectedAnswer.acceptedTextAnswers.every(
          (text) =>
            /^[\u3040-\u30ffー\s・]+$/u.test(text) && /[\u3041-\u3096\u30a1-\u30fa]/u.test(text),
        );

      const options = question.promptPayload.options;

      return (
        new Set(options.map((option) => option.id)).size === 4 &&
        new Set(options.map((option) => option.label.normalize('NFKC').trim())).size === 4 &&
        options.every((option) => japanese(option.label)) &&
        options.some((option) => option.id === question.expectedAnswer.correctOptionId)
      );
    }

    if (question.questionType === 'ARRANGE_TOKEN') {
      const prompt = question.promptPayload;
      const enToJa = prompt.direction === 'EN_TO_JA';
      const ids = prompt.arrangeTokens.map((token) => token.id);

      return (
        prompt.promptLanguage === (enToJa ? 'EN' : 'JA') &&
        prompt.answerLanguage === (enToJa ? 'JA' : 'EN') &&
        (enToJa ? english(prompt.sourceSentence) : japanese(prompt.sourceSentence)) &&
        prompt.arrangeTokens.every((token) =>
          enToJa
            ? japanese(token.label) || /^[。、！？!?]$/u.test(token.label)
            : english(token.label) || /^[0-9.,!?;:'"()—–“”‘’-]+$/u.test(token.label),
        ) &&
        new Set(ids).size === ids.length &&
        question.expectedAnswer.acceptedTokenOrders.every(
          (order) =>
            order.length === ids.length &&
            new Set(order).size === ids.length &&
            order.every((id) => ids.includes(id)),
        )
      );
    }

    return (
      english(question.promptPayload.sourceSentence) &&
      japanese(question.expectedAnswer.referenceAnswer)
    );
  }

  private context(input: AiRequestBase): AiContextBundle {
    const context = contextSchema.safeParse(input.context);
    if (!context.success || !metadataSchema.safeParse(input.metadata).success)
      throw new AiFailure('INVALID_INPUT');

    const value = context.data;
    const codes = new Set(value.catalog.map((skill) => skill.skillCode));
    const lessons = new Set(value.catalog.map((skill) => skill.lessonSlug));

    if (
      codes.size !== value.catalog.length ||
      (value.currentUnitSlug !== null &&
        !value.catalog.some((skill) => skill.unitSlug === value.currentUnitSlug)) ||
      [
        ...value.weakSkillCodes,
        ...value.masteredSkillCodes,
        ...value.recentMistakes.map((mistake) => mistake.skillCode),
      ].some((code) => !codes.has(code)) ||
      value.lessonUnderstanding.some((lesson) => !lessons.has(lesson.lessonSlug))
    )
      throw new AiFailure('INVALID_INPUT');

    return value;
  }

  private async execute<T>(
    operation: AiOperation,
    input: AiRequestBase,
    parameters: object,
    schema: z.ZodType<T>,
    valid: (output: T, context: AiContextBundle) => boolean,
  ): Promise<T> {
    const context = this.context(input);
    const serialized = JSON.stringify({ context, ...parameters });

    if (serialized.length > this.config.maxInputChars) throw new AiFailure('INVALID_INPUT');

    const id = randomUUID();
    const startedAt = new Date();

    const model =
      operation === 'SUMMARIZE_PLACEMENT'
        ? this.config.lightweightModel
        : this.config.generationModel;
    const schemaName = operation.toLowerCase();

    const attempts: AiAttemptLog[] = [];

    await this.persist(() =>
      this.logs.start({
        id,
        requestKey: input.metadata.requestId,
        userId: input.metadata.userId ?? null,
        sourceEntityType: input.metadata.sourceEntityType ?? null,
        sourceEntityId: input.metadata.sourceEntityId ?? null,
        sourceModule: operation.includes('PRACTICE') ? 'PRACTICE' : 'PERSONALIZATION',
        operationName: operation,
        provider: this.provider.name,
        model,
        schemaName,
        startedAt,
        metadata: { templateVersion: 1, catalogSkillCount: context.catalog.length },
      }),
    );

    for (let number = 1; number <= this.config.maxRetries + 1; number++) {
      const attemptStartedAt = new Date();
      let usage: AiUsage | null = null;
      let providerRequestId: string | null = null;
      let result: T | undefined;
      let failure: AiFailure | undefined;

      try {
        const response = await this.provider.generate({
          model,
          instructions: aiInstructions(operation),
          input: serialized,
          schemaName,
          jsonSchema: z.toJSONSchema(schema) as Record<string, unknown>,
          timeoutMs: this.config.timeoutMs,
          maxOutputTokens: this.config.maxOutputTokens,
        });

        usage = response.usage;
        providerRequestId = response.providerRequestId;

        try {
          const parsed = schema.safeParse(JSON.parse(response.outputText));

          if (!parsed.success || !valid(parsed.data, context))
            throw new AiFailure('INVALID_OUTPUT', true);

          result = parsed.data;
        } catch {
          throw new AiFailure('INVALID_OUTPUT', true, usage, providerRequestId);
        }
      } catch (error) {
        failure = error instanceof AiFailure ? error : new AiFailure('PROVIDER_UNAVAILABLE', true);
        usage = failure.usage;
        providerRequestId = failure.providerRequestId;
      }

      const completedAt = new Date();
      const attempt: AiAttemptLog = {
        id: randomUUID(),
        aiRequestLogId: id,
        attemptNumber: number,
        provider: this.provider.name,
        model,
        providerRequestId,
        attemptStatus: !failure
          ? 'SUCCEEDED'
          : failure.code === 'TIMEOUT'
            ? 'TIMEOUT'
            : failure.code === 'INVALID_OUTPUT'
              ? 'PARSE_FAILED'
              : 'FAILED',
        latencyMs: completedAt.getTime() - attemptStartedAt.getTime(),
        usage,
        estimatedCostUsd: this.cost(model, usage),
        schemaParseSuccess: !failure,
        failureCode: failure?.code ?? null,
        failureReason: failure?.message ?? null,
        startedAt: attemptStartedAt,
        completedAt,
      };

      attempts.push(attempt);
      await this.persist(() => this.logs.recordAttempt(attempt));

      if (!failure || !failure.retryable || number > this.config.maxRetries) {
        const knownUsages = attempts.flatMap((item) => (item.usage ? [item.usage] : []));
        const totalUsage =
          knownUsages.length === attempts.length
            ? knownUsages.reduce(
                (sum, item) => ({
                  inputTokens: sum.inputTokens + item.inputTokens,
                  cachedInputTokens: sum.cachedInputTokens + item.cachedInputTokens,
                  outputTokens: sum.outputTokens + item.outputTokens,
                  totalTokens: sum.totalTokens + item.totalTokens,
                }),
                { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, totalTokens: 0 },
              )
            : null;

        const costs = attempts.flatMap((item) =>
          item.estimatedCostUsd === null ? [] : [item.estimatedCostUsd],
        );

        await this.persist(() =>
          this.logs.complete(id, {
            requestStatus: failure ? 'FAILED' : 'SUCCEEDED',
            schemaParseSuccess: !failure,
            retryCount: attempts.length - 1,
            totalLatencyMs: Date.now() - startedAt.getTime(),
            usage: totalUsage,
            estimatedCostUsd:
              costs.length === attempts.length
                ? costs.reduce((sum, value) => sum + value, 0)
                : null,
            failureCode: failure?.code ?? null,
            failureReason: failure?.message ?? null,
            completedAt: new Date(),
          }),
        );

        if (failure) throw failure;

        return result as T;
      }

      await this.sleep(this.config.retryDelayMs * number);
    }

    throw new AiFailure('CONFIGURATION');
  }

  private cost(model: string, usage: AiUsage | null): number | null {
    const rates = this.config.modelCosts?.[model];
    if (!rates || !usage) return null;

    return (
      ((usage.inputTokens - usage.cachedInputTokens) * rates.inputPerMillionUsd +
        usage.cachedInputTokens * rates.cachedInputPerMillionUsd +
        usage.outputTokens * rates.outputPerMillionUsd) /
      1_000_000
    );
  }

  private async persist(work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch {
      throw new AiFailure('OBSERVABILITY');
    }
  }
}
