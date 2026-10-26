import { PracticeError } from '@/backend/practice/domain/exceptions/practice-error';
import type {
  Grade,
  PracticeQuestion,
  UserAnswer,
} from '@/backend/practice/domain/repositories/practice.repository';

export class DeterministicAnswerEvaluator {
  evaluate(
    question: Pick<PracticeQuestion, 'questionType' | 'promptPayload' | 'expectedAnswer'>,
    answer: UserAnswer,
  ): Grade {
    let correct = false;
    let matched: string[] = [];

    if (question.questionType === 'SHORT_FREE_RESPONSE') {
      if (!('normalizedKana' in answer))
        throw new PracticeError(142206001, 'A text answer is required.', 'userAnswer');

      const accepted = question.expectedAnswer.acceptedTextAnswers as string[];
      matched = ['normalizedKana', 'normalizedKanji'].filter((key) => {
        const value = answer[key as keyof typeof answer];

        return typeof value === 'string' && accepted.some((a) => normalize(a) === normalize(value));
      });
      correct = matched.length > 0;
    } else if (question.questionType === 'SLOT_FILL') {
      if (!('selectedOptionId' in answer))
        throw new PracticeError(142206001, 'An option answer is required.', 'userAnswer');

      if (
        !(question.promptPayload.options as { id: string }[]).some(
          (o) => o.id === answer.selectedOptionId,
        )
      )
        throw new PracticeError(
          142206001,
          'Option is not available.',
          'userAnswer.selectedOptionId',
        );

      correct = answer.selectedOptionId === question.expectedAnswer.correctOptionId;
      matched = correct ? ['selectedOptionId'] : [];
    } else if (question.questionType === 'ARRANGE_TOKEN') {
      if (!('arrangedTokenIds' in answer))
        throw new PracticeError(142206001, 'A token order is required.', 'userAnswer');

      const ids = (question.promptPayload.arrangeTokens as { id: string }[]).map((t) => t.id);

      if (
        answer.arrangedTokenIds.length !== ids.length ||
        new Set(answer.arrangedTokenIds).size !== ids.length ||
        answer.arrangedTokenIds.some((id) => !ids.includes(id))
      )
        throw new PracticeError(
          142206001,
          'Submit every token exactly once.',
          'userAnswer.arrangedTokenIds',
        );

      correct = (question.expectedAnswer.acceptedTokenOrders as string[][]).some((order) =>
        order.every((id, i) => id === answer.arrangedTokenIds[i]),
      );
      matched = correct ? ['arrangedTokenIds'] : [];
    } else throw new PracticeError(142206001, 'Question requires AI grading.', 'userAnswer');

    return {
      isCorrect: correct,
      numericScore: correct ? 100 : 0,
      feedbackText: correct ? 'Correct answer.' : 'Review the lesson before your next practice.',
      gradingSource: 'RULE_ENGINE',
      gradingMetadata: {
        gradingStrategy: 'DETERMINISTIC',
        matchedAnswerKeys: matched,
        accepted: correct,
      },
    };
  }
}

function normalize(value: string) {
  return value.normalize('NFKC').trim();
}
