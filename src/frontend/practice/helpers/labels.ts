export const DIFFICULTY_LABELS = {
  REMEDIAL: 'Foundation',
  STANDARD: 'Standard',
  STRETCH: 'Stretch',
};

export const MASTERY_LABELS = {
  WEAK: 'Needs review',
  DEVELOPING: 'Developing',
  STABLE: 'Stable',
  MASTERED: 'Mastered',
};

export function skillLabel(code: string) {
  return code.replace(/[_-]/g, ' ');
}
