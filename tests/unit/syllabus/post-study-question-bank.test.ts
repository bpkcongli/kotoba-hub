import { InvalidPublishedLesson } from '@/backend/syllabus/domain/exceptions/invalid-published-lesson';
import {
  PostStudyQuestionBank,
  type CanonicalPostStudyQuestion,
} from '@/backend/syllabus/domain/value-objects/post-study-question-bank';

function questions(): CanonicalPostStudyQuestion[] {
  return Array.from({ length: 10 }, (_, index) => ({
    id: `00000000-0000-5000-8000-${String(index + 1).padStart(12, '0')}`,
    skillCode: 'topic_particle',
    difficultyLevel: index + 1,
    questionType: 'SHORT_FREE_RESPONSE',
    promptPayload: {
      schemaVersion: 1,
      sentenceTemplate: 'わたし___がくせいです。',
      sentenceTemplateHtml: '<p>わたし___がくせいです。</p>',
      promptLanguage: 'JA',
      answerLanguage: 'JA',
      slotCount: 1,
      blankInputMode: 'ROMAJI_TO_KANA',
      inputMethod: { acceptsRomaji: true, transformsTo: 'KANA' },
    },
    expectedAnswer: { acceptedTextAnswers: ['は'] },
    explanation: null,
    sourceRefs: [],
  }));
}

describe('post-study question bank', () => {
  it('accepts ten questions and keeps deterministic difficulty selection', () => {
    const bank = new PostStudyQuestionBank('topic', questions(), ['topic_particle']);

    expect(bank.get(1).id).toBe('00000000-0000-5000-8000-000000000001');
    expect(bank.get(10).id).toBe('00000000-0000-5000-8000-000000000010');
    expect(() => bank.get(11)).toThrow(RangeError);
  });

  it('accepts optional prompt helpers, normalization profile and explanation', () => {
    const entries = questions();
    Object.assign(entries[0].promptPayload, {
      placeholder: 'Answer here',
      hintTexts: ['<p>Use the topic particle.</p>'],
    });
    entries[0].expectedAnswer.normalizationProfile = 'kana-strict-v1';
    entries[0].explanation = '<p>Use は to mark the topic.</p>';

    const bank = new PostStudyQuestionBank('topic', entries, ['topic_particle']);

    expect(bank.get(1)).toBe(entries[0]);
  });

  it.each([
    ['promptPayload', undefined],
    ['promptPayload', null],
    ['promptPayload', []],
    ['expectedAnswer', undefined],
    ['expectedAnswer', null],
    ['expectedAnswer', []],
    ['explanation', 12],
    ['sourceRefs', undefined],
    ['sourceRefs', null],
    ['sourceRefs', {}],
  ])('rejects malformed %s = %j with the existing payload error', (field, value) => {
    const entries = questions();
    Object.assign(entries[0], { [field]: value });

    expect(() => new PostStudyQuestionBank('topic', entries, ['topic_particle'])).toThrow(
      new InvalidPublishedLesson(
        'topic',
        `question ${entries[0].id} has an invalid prompt or answer`,
      ),
    );
  });

  it.each([
    ['invalid id', (bank: CanonicalPostStudyQuestion[]) => (bank[0].id = 'not-a-uuid')],
    ['schemaVersion', undefined],
    ['schemaVersion', 0],
    ['schemaVersion', 1.5],
    ['schemaVersion', '1'],
    ['promptLanguage', 'EN'],
    ['answerLanguage', 'EN'],
    ['slotCount', 2],
    ['blankInputMode', 'TEXT'],
    ['sentenceTemplate', 'わたしがくせいです。'],
    ['sentenceTemplate', 'わたし___がくせい___です。'],
    ['sentenceTemplateHtml', undefined],
    ['sentenceTemplateHtml', '<p>わたしがくせいです。</p>'],
    ['placeholder', 12],
    ['hintTexts', 'hint'],
    ['hintTexts', ['']],
    ['hintTexts', [12]],
    ['inputMethod', null],
    ['inputMethod', []],
    ['inputMethod', { acceptsRomaji: false, transformsTo: 'KANA' }],
    ['inputMethod', { acceptsRomaji: true, transformsTo: 'LATIN' }],
    ['inputMethod', { acceptsRomaji: true, transformsTo: 'KANA', unexpected: true }],
    ['unexpected', true],
  ])('rejects invalid prompt field %s = %j', (key, value) => {
    const bank = questions();
    bank[0].promptPayload[key] = value;

    expect(() => new PostStudyQuestionBank('topic', bank, ['topic_particle'])).toThrow(
      InvalidPublishedLesson,
    );
  });

  it.each([
    { acceptedTextAnswers: [] },
    { acceptedTextAnswers: [''] },
    { acceptedTextAnswers: ['   '] },
    { acceptedTextAnswers: ['・ー'] },
    { acceptedTextAnswers: ['wa'] },
    { acceptedTextAnswers: [12] },
    { acceptedTextAnswers: ['は'], normalizationProfile: '' },
    { acceptedTextAnswers: ['は'], normalizationProfile: 12 },
    { acceptedTextAnswers: ['は'], unexpected: true },
  ])('rejects an invalid expected answer %j', (expectedAnswer) => {
    const bank = questions();
    bank[0].expectedAnswer = expectedAnswer;

    expect(() => new PostStudyQuestionBank('topic', bank, ['topic_particle'])).toThrow(
      InvalidPublishedLesson,
    );
  });

  it.each([
    ['missing question', (bank: CanonicalPostStudyQuestion[]) => bank.pop()],
    ['duplicate id', (bank: CanonicalPostStudyQuestion[]) => (bank[1].id = bank[0].id)],
    ['duplicate difficulty', (bank: CanonicalPostStudyQuestion[]) => (bank[1].difficultyLevel = 1)],
    [
      'wrong question type',
      (bank: CanonicalPostStudyQuestion[]) => (bank[0].questionType = 'MULTIPLE_CHOICE'),
    ],
    [
      'foreign skill',
      (bank: CanonicalPostStudyQuestion[]) => (bank[0].skillCode = 'other_lesson_skill'),
    ],
  ])('rejects %s', (_, change) => {
    const bank = questions();
    change(bank);

    expect(() => new PostStudyQuestionBank('topic', bank, ['topic_particle'])).toThrow(
      InvalidPublishedLesson,
    );
  });
});
