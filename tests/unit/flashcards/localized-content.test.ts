import { assertFlashcardRevision } from '@/backend/flashcards/application/helpers/flashcard-import-validation';
import { OptionSnapshotBuilder } from '@/backend/flashcards/domain/services/option-snapshot-builder';
import { ScriptPair } from '@/backend/flashcards/domain/value-objects/script-pair';
import { toFlashcardItemDto } from '@/backend/flashcards/interface/primary/rest/dto/flashcard.response.dto';
import { item } from './fixtures';
import { translation } from './localized-fixtures';

it.each([
  ['KANJI', 'MEANING'],
  ['MEANING', 'KANJI'],
  ['KANA', 'MEANING'],
  ['MEANING', 'KANA'],
])('supports localized kanji %s→%s', (question, answer) => {
  expect(ScriptPair.create('KANJI', question, answer, true)).toBeDefined();
});

it.each([
  ['MEANING', false],
  ['ENGLISH', true],
] as const)('rejects %s in the other representation', (mode, localized) => {
  expect(() => ScriptPair.create('KANJI', 'KANJI', mode, localized)).toThrow();
});

it('normalizes translated duplicates and excludes every correct alias before snapshotting', () => {
  const value = item({ contentRevision: 1 });
  const content = translation(value);

  content.meaningOptions!.distractors = [' HARI ', 'ＡＩＲ', 'air', 'bulan', ' BULAN '];
  value.localizations = { en: translation(value, 'day'), id: content };

  const turn = new OptionSnapshotBuilder(() => 0).build(value, 'KANJI', 'MEANING', 'id');

  expect(turn.answerOptions).toHaveLength(3);
  expect(turn.answerOptions.map((option) => option.value)).not.toContain('HARI');

  const dto = toFlashcardItemDto(turn);

  expect(dto).toHaveProperty('localization.resolvedLocale', 'id');
  for (const key of ['item', 'correctOptionId', 'localizedContent', 'sourceRefs', 'localizations'])
    expect(dto).not.toHaveProperty(key);
});

it('rejects a translated Japanese canonical override and falls back to the original English package', () => {
  const value = item({ contentRevision: 1 });
  const id = translation(value);

  id.scriptOptions.KANJI!.canonicalAnswer = '月';
  value.localizations = { en: translation(value, 'day'), id };

  expect(
    new OptionSnapshotBuilder(() => 0).build(value, 'MEANING', 'KANJI', 'id').localization
      ?.resolvedLocale,
  ).toBe('en');
});

it('requires content and translation revision increases and accepts identical content', () => {
  const value = item({ contentRevision: 1 });
  value.localizations = { en: translation(value, 'day') };
  const current = { ...value };

  expect(() =>
    assertFlashcardRevision(current, structuredClone(current), ['surfaceFormText']),
  ).not.toThrow();
  expect(() =>
    assertFlashcardRevision(current, { ...current, surfaceFormText: '月' }, ['surfaceFormText']),
  ).toThrow(/without a new revision/);

  const changed = structuredClone(current);
  changed.localizations!.en!.explanationText = 'Changed';

  expect(() => assertFlashcardRevision(current, changed, ['surfaceFormText'])).toThrow(
    /without a new revision/,
  );

  changed.localizations!.en!.translationRevision = 2;

  expect(() => assertFlashcardRevision(current, changed, ['surfaceFormText'])).not.toThrow();
  expect(() => assertFlashcardRevision(changed, current, ['surfaceFormText'])).toThrow(/backwards/);
});

it('requires current published English even when Indonesian is available', () => {
  const value = item({ contentRevision: 1 });
  value.localizations = {
    en: { ...translation(value, 'day'), isPublished: false },
    id: translation(value),
  };

  expect(() => new OptionSnapshotBuilder(() => 0).build(value, 'KANJI', 'MEANING', 'id')).toThrow();
});

it('does not allow a translated package to redefine Japanese aliases', () => {
  const value = item({ contentRevision: 1 });
  const id = translation(value);

  id.scriptOptions.KANJI!.aliases.push('月');
  value.localizations = { en: translation(value, 'day'), id };

  expect(
    new OptionSnapshotBuilder(() => 0).build(value, 'KANJI', 'MEANING', 'id').localization
      ?.resolvedLocale,
  ).toBe('en');
});

it('requires a new translation revision when recertifying against a new source revision', () => {
  const value = {
    ...item({ contentRevision: 1 }),
    localizations: { en: translation(item(), 'day') },
  };

  const next = structuredClone(value);
  next.contentRevision = 2;
  next.localizations.en.sourceRevision = 2;

  expect(() => assertFlashcardRevision(value, next, ['surfaceFormText'])).toThrow(
    /without a new revision/,
  );
});
