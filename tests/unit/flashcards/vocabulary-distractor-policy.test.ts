import { validateVocabularyDistractors } from '@/backend/flashcards/application/helpers/validate-vocabulary-distractors';
import type { FlashcardSeedItem } from '@/backend/flashcards/application/services/prepare-flashcard-seed.service';
import { item } from './fixtures';

const peers = ['peer1', 'peer2', 'peer3', 'peer4', 'peer5', 'peer6'];

function vocabulary(): FlashcardSeedItem {
  return {
    ...item(),
    explanationText: null,
    contentRevision: 5,
    itemType: 'VOCABULARY',
    answerOptionPayload: {
      JAPANESE: { canonicalAnswer: '鉛筆', distractors: ['犬', '猫', '鳥', '魚', '馬', '牛'] },
      KANA: {
        canonicalAnswer: 'えんぴつ',
        distractors: ['いぬ', 'ねこ', 'とり', 'さかな', 'うま', 'うし'],
      },
      ENGLISH: {
        canonicalAnswer: 'pencil',
        distractors: ['dog', 'cat', 'bird', 'fish', 'horse', 'cow'],
      },
    },
  };
}

it('requires six reviewed peers and six usable values after normalization for each bank', () => {
  const source = vocabulary();

  const normalizedDuplicate = vocabulary();
  normalizedDuplicate.answerOptionPayload.ENGLISH!.distractors[5] = ' ＤＯＧ ';

  const canonicalLeak = vocabulary();
  canonicalLeak.answerOptionPayload.ENGLISH!.distractors[5] = '鉛筆';

  expect(() => validateVocabularyDistractors(source, peers)).not.toThrow();
  expect(() => validateVocabularyDistractors(source)).toThrow(/six reviewed/);
  expect(() => validateVocabularyDistractors(source, peers.slice(1))).toThrow(/six reviewed/);
  expect(() => validateVocabularyDistractors(normalizedDuplicate, peers)).toThrow(
    /legacy\/ENGLISH/,
  );
  expect(() => validateVocabularyDistractors(canonicalLeak, peers)).toThrow(/legacy\/ENGLISH/);
});

it('validates each available locale without manufacturing a missing translation', () => {
  const source = vocabulary();
  source.localizations = {
    en: {
      sourceRevision: 5,
      translationRevision: 5,
      isPublished: true,
      sourceRefs: ['test'],
      meaning: 'pencil',
      explanationText: null,
      exampleWords: [],
      scriptOptions: {},
      meaningOptions: {
        canonicalAnswer: 'pencil',
        aliases: ['pencil'],
        distractors: ['dog', 'cat', 'bird', 'fish', 'horse', 'cow'],
      },
    },
  };

  const invalidIndonesian = structuredClone(source);
  invalidIndonesian.localizations!.id = {
    ...structuredClone(source.localizations.en!),
    meaning: 'pensil',
  };
  invalidIndonesian.localizations!.id!.meaningOptions!.distractors.pop();

  expect(() => validateVocabularyDistractors(source, peers)).not.toThrow();
  expect(() => validateVocabularyDistractors(invalidIndonesian, peers)).toThrow(/id\/MEANING/);
});

it('retains compatibility for historical revision banks and other content families', () => {
  const historical = vocabulary();
  historical.answerOptionPayload.ENGLISH!.distractors = ['dog'];
  historical.contentRevision = 4;

  const kanji = vocabulary();
  kanji.answerOptionPayload.ENGLISH!.distractors = ['dog'];
  kanji.itemType = 'KANJI_CHARACTER';

  expect(() => validateVocabularyDistractors(historical)).not.toThrow();
  expect(() => validateVocabularyDistractors(kanji)).not.toThrow();
});
