import { cn } from '@/frontend/shared/helpers/cn';

test.each([
  'text-display',
  'text-h1',
  'text-h2',
  'text-h3',
  'text-body-lg',
  'text-body',
  'text-body-sm',
  'text-label',
  'text-caption',
])('preserves %s when adding a semantic text color in either order', (fontSize) => {
  for (const [color, classes] of [
    ['text-muted-foreground', cn(fontSize, 'text-muted-foreground')],
    ['text-foreground', cn('text-foreground', fontSize)],
  ]) {
    const tokens = classes.split(' ');

    expect(tokens).toContain(fontSize);
    expect(tokens).toContain(color);
    expect(tokens).toHaveLength(2);
  }
});

test.each([
  { original: 'text-h1', override: 'text-body' },
  { original: 'text-body', override: 'text-lg' },
  { original: 'text-lg', override: 'text-h2' },
  { original: 'text-h3', override: 'text-[2rem]' },
])(
  'lets $override replace the font size $original without dropping its color',
  ({ original, override }) => {
    const tokens = cn(original, 'text-foreground', override).split(' ');

    expect(tokens).toContain(override);
    expect(tokens).toContain('text-foreground');
    expect(tokens).not.toContain(original);
    expect(tokens).toHaveLength(2);
  },
);

test('keeps responsive font sizes independent while replacing sizes within the same breakpoint', () => {
  const tokens = cn(
    'text-body text-muted-foreground md:text-h1',
    'text-sm text-foreground md:text-h2',
  ).split(' ');

  expect(tokens).toEqual(expect.arrayContaining(['text-sm', 'text-foreground', 'md:text-h2']));
  expect(tokens).toHaveLength(3);
});
