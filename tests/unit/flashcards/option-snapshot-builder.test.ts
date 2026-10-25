import { OptionSnapshotBuilder } from '@/backend/flashcards/domain/services/option-snapshot-builder';
import { item } from './fixtures';

describe('flashcard answer option snapshots', () => {
  it('builds a bounded set of distinct options with one canonical answer', () => {
    const snapshot = new OptionSnapshotBuilder(() => 0).build(item(), 'KANJI', 'ENGLISH');

    expect(snapshot.prompt).toEqual({ scriptMode: 'KANJI', value: '日' });
    expect(snapshot.answerOptions).toHaveLength(4);
    expect(new Set(snapshot.answerOptions.map((option) => option.value)).size).toBe(4);
    expect(new Set(snapshot.answerOptions.map((option) => option.id)).size).toBe(4);
    expect(snapshot.answerOptions.every((option) => option.scriptMode === 'ENGLISH')).toBe(true);
    expect(snapshot.answerOptions.find((option) => option.id === snapshot.correctOptionId)).toEqual(
      expect.objectContaining({ value: 'day / sun' }),
    );
  });

  it('removes duplicate, blank, and canonical representations from the distractor pool', () => {
    const source = item();
    source.answerOptionPayload.ENGLISH!.distractors = [
      'day / sun',
      ' day / sun ',
      '日',
      'にち・ひ',
      ' ',
      ' fire ',
      'fire',
    ];

    const snapshot = new OptionSnapshotBuilder(() => 0).build(source, 'KANJI', 'ENGLISH');

    expect(snapshot.answerOptions.map((option) => option.value).sort()).toEqual([
      'day / sun',
      'fire',
    ]);
  });

  it('allows option variety between sessions while retaining the original snapshot', () => {
    const source = item();
    const first = new OptionSnapshotBuilder(() => 0).build(source, 'KANJI', 'ENGLISH');
    const original = structuredClone(first);
    const second = new OptionSnapshotBuilder((maximum) => maximum - 1).build(
      source,
      'KANJI',
      'ENGLISH',
    );

    expect(first.answerOptions).not.toEqual(second.answerOptions);
    source.answerOptionPayload.ENGLISH!.canonicalAnswer = 'changed after session creation';
    source.onyomiReadings!.push('changed reading');
    expect(first).toEqual(original);
  });

  it('rejects missing canonical data and pools without a usable distractor', () => {
    const builder = new OptionSnapshotBuilder(() => 0);
    const missingAnswer = item();
    delete missingAnswer.answerOptionPayload.ENGLISH;

    expect(() => builder.build(missingAnswer, 'KANJI', 'ENGLISH')).toThrow();
    expect(() => builder.build(item(), 'ROMAJI', 'ENGLISH')).toThrow();

    const noDistractors = item();
    noDistractors.answerOptionPayload.ENGLISH!.distractors = ['day / sun', '日', ''];

    expect(() => builder.build(noDistractors, 'KANJI', 'ENGLISH')).toThrow();
  });

  it('treats width, case, and repeated whitespace variants as the same answer', () => {
    const source = item();
    source.answerOptionPayload.ENGLISH = {
      canonicalAnswer: 'Day Sun',
      distractors: ['Ｄａｙ Ｓｕｎ', ' DAY   SUN ', ' FIRE ', 'fire', 'ＦＩＲＥ'],
    };

    const snapshot = new OptionSnapshotBuilder(() => 0).build(source, 'KANJI', 'ENGLISH');

    expect(snapshot.answerOptions).toHaveLength(2);
    expect(
      snapshot.answerOptions.filter((option) => option.id === snapshot.correctOptionId),
    ).toHaveLength(1);
  });
});
