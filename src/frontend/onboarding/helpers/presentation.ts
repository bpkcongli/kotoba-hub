export function levelLabel(level: string | null): string {
  if (!level || level === 'BEGINNER') return 'New to Japanese';

  return level.replace(/^JLPT_/, 'JLPT ');
}

export function scriptLabel(script: string): string {
  return { ROMAJI: 'Romaji', KANA: 'Kana', MIXED: 'Mixed scripts' }[script] ?? script;
}

export const weakFocusOptions = [
  { value: 'kana', label: 'Kana' },
  { value: 'kanji', label: 'Kanji' },
  { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'particles', label: 'Particles' },
  { value: 'grammar', label: 'Grammar' },
  { value: 'reading', label: 'Reading' },
  { value: 'listening', label: 'Listening' },
];

export const formControlClass =
  'min-h-11 w-full rounded-sm border border-muted-foreground bg-card px-3 py-2 text-body text-foreground focus-visible:focus-ring disabled:opacity-50';
