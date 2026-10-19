import { InvalidPublishedLesson } from '@/backend/syllabus/domain/exceptions/invalid-published-lesson';

export interface CanonicalPostStudyQuestion {
  id: string;
  skillCode: string;
  difficultyLevel: number;
  questionType: string;
  promptPayload: Record<string, unknown>;
  expectedAnswer: Record<string, unknown>;
  explanation: string | null;
  sourceRefs: unknown[];
}

export class PostStudyQuestionBank {
  private readonly byDifficulty: Map<number, CanonicalPostStudyQuestion>;

  constructor(
    lessonSlug: string,
    questions: CanonicalPostStudyQuestion[],
    publishedSkillCodes: string[],
  ) {
    this.byDifficulty = new Map();
    if (questions.length !== 10) {
      throw new InvalidPublishedLesson(
        lessonSlug,
        `expected 10 questions, received ${questions.length}`,
      );
    }

    const ids = new Set<string>();
    for (const question of questions) {
      if (
        typeof question.id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
          question.id,
        )
      ) {
        throw new InvalidPublishedLesson(lessonSlug, 'question id must be a canonical UUID');
      }

      if (ids.has(question.id)) {
        throw new InvalidPublishedLesson(lessonSlug, `duplicate question id ${question.id}`);
      }

      ids.add(question.id);
      if (
        !Number.isInteger(question.difficultyLevel) ||
        question.difficultyLevel < 1 ||
        question.difficultyLevel > 10 ||
        this.byDifficulty.has(question.difficultyLevel)
      ) {
        throw new InvalidPublishedLesson(
          lessonSlug,
          'difficulty levels must be unique integers 1 through 10',
        );
      }

      if (
        question.questionType !== 'SHORT_FREE_RESPONSE' ||
        !publishedSkillCodes.includes(question.skillCode)
      ) {
        throw new InvalidPublishedLesson(
          lessonSlug,
          `question ${question.id} has an invalid type or skill attribution`,
        );
      }

      if (
        !this.isValidPrompt(question.promptPayload) ||
        !this.isValidExpectedAnswer(question.expectedAnswer) ||
        !this.isValidQuestionMetadata(question)
      ) {
        throw new InvalidPublishedLesson(
          lessonSlug,
          `question ${question.id} has an invalid prompt or answer`,
        );
      }

      this.byDifficulty.set(question.difficultyLevel, question);
    }
  }

  get(difficultyLevel: number): CanonicalPostStudyQuestion {
    const question = this.byDifficulty.get(difficultyLevel);
    if (!question) throw new RangeError('Difficulty level must be between 1 and 10.');

    return question;
  }

  private isValidPrompt(prompt: unknown): boolean {
    if (!this.isRecord(prompt)) return false;

    return (
      Number.isInteger(prompt.schemaVersion) &&
      (prompt.schemaVersion as number) >= 1 &&
      this.hasSingleBlank(prompt.sentenceTemplate) &&
      this.hasSingleBlank(prompt.sentenceTemplateHtml) &&
      prompt.promptLanguage === 'JA' &&
      prompt.answerLanguage === 'JA' &&
      prompt.slotCount === 1 &&
      prompt.blankInputMode === 'ROMAJI_TO_KANA' &&
      this.isValidInputMethod(prompt.inputMethod) &&
      this.isValidPromptOptions(prompt)
    );
  }

  private hasSingleBlank(template: unknown): boolean {
    return typeof template === 'string' && (template.match(/___/g) ?? []).length === 1;
  }

  private isValidInputMethod(inputMethod: unknown): boolean {
    if (!this.isRecord(inputMethod)) return false;

    return (
      inputMethod.acceptsRomaji === true &&
      inputMethod.transformsTo === 'KANA' &&
      Object.keys(inputMethod).every((key) => ['acceptsRomaji', 'transformsTo'].includes(key))
    );
  }

  private isValidPromptOptions(prompt: Record<string, unknown>): boolean {
    const allowedKeys = [
      'schemaVersion',
      'sentenceTemplate',
      'sentenceTemplateHtml',
      'promptLanguage',
      'answerLanguage',
      'slotCount',
      'blankInputMode',
      'placeholder',
      'hintTexts',
      'inputMethod',
    ];

    return (
      Object.keys(prompt).every((key) => allowedKeys.includes(key)) &&
      (prompt.placeholder === undefined || typeof prompt.placeholder === 'string') &&
      (prompt.hintTexts === undefined ||
        (Array.isArray(prompt.hintTexts) &&
          prompt.hintTexts.every((text) => typeof text === 'string' && text.length > 0)))
    );
  }

  private isValidExpectedAnswer(expectedAnswer: unknown): boolean {
    if (!this.isRecord(expectedAnswer)) return false;

    const answers = expectedAnswer.acceptedTextAnswers;
    return (
      Object.keys(expectedAnswer).every((key) =>
        ['acceptedTextAnswers', 'normalizationProfile'].includes(key),
      ) &&
      (expectedAnswer.normalizationProfile === undefined ||
        (typeof expectedAnswer.normalizationProfile === 'string' &&
          expectedAnswer.normalizationProfile.length > 0)) &&
      Array.isArray(answers) &&
      answers.length > 0 &&
      answers.every(
        (answer) =>
          typeof answer === 'string' &&
          answer.trim().length > 0 &&
          /[\u3041-\u3096\u30a1-\u30fa]/u.test(answer) &&
          /^[\u3040-\u30ffー\s・]+$/u.test(answer),
      )
    );
  }

  private isValidQuestionMetadata(question: CanonicalPostStudyQuestion): boolean {
    return (
      (question.explanation === undefined ||
        question.explanation === null ||
        typeof question.explanation === 'string') &&
      Array.isArray(question.sourceRefs)
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
