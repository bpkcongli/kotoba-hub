import type { ContentType, ScriptMode } from '@/frontend/flashcards/interfaces/entities';
import type { UiMessageKey } from '@/shared/i18n';

export const SCRIPT_MESSAGE_KEYS: Record<ScriptMode, UiMessageKey> = {
  KANJI: 'SHARED:SCRIPT_OPTIONS.KANJI.LABEL',
  KANA: 'SHARED:SCRIPT_OPTIONS.KANA.LABEL',
  ENGLISH: 'SHARED:SCRIPT_OPTIONS.ENGLISH.LABEL',
  MEANING: 'SHARED:SCRIPT_OPTIONS.MEANING.LABEL',
  ROMAJI: 'SHARED:SCRIPT_OPTIONS.ROMAJI.LABEL',
  JAPANESE: 'SHARED:LANGUAGE_OPTIONS.JAPANESE.LABEL',
};

export const CONTENT_MESSAGE_KEYS: Record<ContentType, UiMessageKey> = {
  KANJI: 'SHARED:SCRIPT_OPTIONS.KANJI.LABEL',
  KANA: 'SHARED:SCRIPT_OPTIONS.KANA.LABEL',
  VOCABULARY: 'SHARED:SKILL_TYPES.VOCABULARY.LABEL',
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
