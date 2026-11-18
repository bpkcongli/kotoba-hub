import type { ContentType, ScriptMode } from '@/frontend/flashcards/interfaces/entities';

export const SCRIPT_LABELS: Record<ScriptMode, string> = {
  KANJI: 'Kanji',
  KANA: 'Kana',
  ENGLISH: 'English',
  MEANING: 'Meaning',
  ROMAJI: 'Romaji',
  JAPANESE: 'Japanese',
};

export const CONTENT_LABELS: Record<ContentType, string> = {
  KANJI: 'Kanji',
  KANA: 'Kana',
  VOCABULARY: 'Vocabulary',
};

export function questionModes(content: ContentType, localized = false): ScriptMode[] {
  return content === 'KANJI'
    ? ['KANJI', 'KANA', localized ? 'MEANING' : 'ENGLISH']
    : content === 'KANA'
      ? ['KANA', 'ROMAJI']
      : ['JAPANESE', localized ? 'MEANING' : 'ENGLISH'];
}

export function answerModes(
  content: ContentType,
  question: ScriptMode,
  localized = false,
): ScriptMode[] {
  if (content === 'KANJI')
    return questionModes(content, localized).filter((mode) => mode !== question);

  if (content === 'KANA') return question === 'KANA' ? ['ROMAJI'] : ['KANA'];

  return question === 'JAPANESE' ? [localized ? 'MEANING' : 'ENGLISH'] : ['JAPANESE', 'KANA'];
}

export function isJapanese(mode: ScriptMode) {
  return ['KANJI', 'KANA', 'JAPANESE'].includes(mode);
}
