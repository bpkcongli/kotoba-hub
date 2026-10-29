import type { ContentType, ScriptMode } from '@/frontend/flashcards/interfaces/entities';

export const SCRIPT_LABELS: Record<ScriptMode, string> = {
  KANJI: 'Kanji',
  KANA: 'Kana',
  ENGLISH: 'English',
  ROMAJI: 'Romaji',
  JAPANESE: 'Japanese',
};

export const CONTENT_LABELS: Record<ContentType, string> = {
  KANJI: 'Kanji',
  KANA: 'Kana',
  VOCABULARY: 'Vocabulary',
};

export function questionModes(content: ContentType): ScriptMode[] {
  return content === 'KANJI'
    ? ['KANJI', 'KANA', 'ENGLISH']
    : content === 'KANA'
      ? ['KANA', 'ROMAJI']
      : ['JAPANESE', 'ENGLISH'];
}

export function answerModes(content: ContentType, question: ScriptMode): ScriptMode[] {
  if (content === 'KANJI') return questionModes(content).filter((mode) => mode !== question);

  if (content === 'KANA') return question === 'KANA' ? ['ROMAJI'] : ['KANA'];

  return question === 'JAPANESE' ? ['ENGLISH'] : ['JAPANESE', 'KANA'];
}

export function isJapanese(mode: ScriptMode) {
  return ['KANJI', 'KANA', 'JAPANESE'].includes(mode);
}
