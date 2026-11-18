import { uiTranslator, type UiMessageKey } from '@/shared/i18n';
import type { Locale } from '@/shared/locale';

export function levelLabel(level: string | null, locale: Locale = 'en'): string {
  if (!level || level === 'BEGINNER')
    return uiTranslator(locale)(
      'ONBOARDING:ASSESSMENT_FORM.CURRENT_LEVEL_SELECT.BEGINNER_OPTION_LABEL',
    );

  return level.replace(/^JLPT_/, 'JLPT ');
}

export function scriptLabel(script: string, locale: Locale = 'en'): string {
  const labels: Record<string, UiMessageKey> = {
    ROMAJI: 'SHARED:SCRIPT_OPTIONS.ROMAJI.LABEL',
    KANA: 'SHARED:SCRIPT_OPTIONS.KANA.LABEL',
    MIXED: 'SHARED:SCRIPT_OPTIONS.MIXED.LABEL',
  };
  const key = labels[script];

  return key ? uiTranslator(locale)(key) : script;
}

export const weakFocusOptions = [
  { value: 'kana', label: 'ONBOARDING:FOCUS_OPTIONS.KANA.LABEL' },
  { value: 'kanji', label: 'ONBOARDING:FOCUS_OPTIONS.KANJI.LABEL' },
  { value: 'vocabulary', label: 'SHARED:SKILL_TYPES.VOCABULARY.LABEL' },
  { value: 'particles', label: 'ONBOARDING:FOCUS_OPTIONS.PARTICLES.LABEL' },
  { value: 'grammar', label: 'ONBOARDING:FOCUS_OPTIONS.GRAMMAR.LABEL' },
  { value: 'reading', label: 'ONBOARDING:FOCUS_OPTIONS.READING.LABEL' },
  { value: 'listening', label: 'ONBOARDING:FOCUS_OPTIONS.LISTENING.LABEL' },
] as const;

export const formControlClass =
  'min-h-11 w-full rounded-sm border border-muted-foreground bg-card px-3 py-2 text-body text-foreground focus-visible:focus-ring disabled:opacity-50';
