import { normalizeContentBlock } from '@/backend/syllabus/application/helpers/normalize-content-block';

describe('syllabus content block validation', () => {
  it.each([
    ['PARAGRAPH', { body: '<p>Lesson text</p>' }],
    [
      'EXAMPLE_SENTENCE',
      { japaneseSentence: '<p>あさです。</p>', englishTranslation: '<p>It is morning.</p>' },
    ],
    ['GRAMMAR_STRUCTURE', { skillCode: 'topic_particle', ALL: '<p>Use は.</p>', STANDARD: null }],
  ])('keeps valid %s content', (blockType, content) => {
    const block = { id: 'block', blockType, content, sortOrder: 1, isPublished: true };

    expect(normalizeContentBlock(block)).toBe(block);
  });

  it.each([
    ['PARAGRAPH', {}],
    ['PARAGRAPH', { body: '' }],
    ['PARAGRAPH', { body: '   ' }],
    ['PARAGRAPH', { body: 12 }],
    ['PARAGRAPH', { body: '<p>Valid</p>', extra: true }],
    ['EXAMPLE_SENTENCE', { japaneseSentence: '<p>あさです。</p>' }],
    ['EXAMPLE_SENTENCE', { japaneseSentence: '<p>あさです。</p>', englishTranslation: '' }],
    ['GRAMMAR_STRUCTURE', { ALL: '<p>Missing skill code</p>' }],
    ['GRAMMAR_STRUCTURE', { skillCode: 'topic_particle', ALL: null, STANDARD: null, POLITE: null }],
    ['GRAMMAR_STRUCTURE', { skillCode: 'topic_particle', ALL: '   ' }],
    ['GRAMMAR_STRUCTURE', { skillCode: 'topic_particle', ALL: '<p>Valid</p>', STANDARD: 12 }],
    ['UNSUPPORTED', { body: '<p>Text</p>' }],
  ])('rejects malformed %s content %j', (blockType, content) => {
    expect(() =>
      normalizeContentBlock({ id: 'block', blockType, content, sortOrder: 1, isPublished: true }),
    ).toThrow(/invalid/);
  });

  it('escapes legacy plaintext paragraphs before storing HTML', () => {
    expect(
      normalizeContentBlock({
        id: 'block',
        blockType: 'PARAGRAPH',
        body: 'Use A & B < C.',
        sortOrder: 1,
        isPublished: true,
      }).content,
    ).toEqual({ body: '<p>Use A &amp; B &lt; C.</p>' });
  });

  it('also validates the payload produced from a legacy paragraph', () => {
    const block = {
      id: 'block',
      blockType: 'PARAGRAPH',
      body: 'Lesson text',
      sortOrder: 1,
      isPublished: true,
    };
    Object.assign(block, { title: 12 });

    expect(() => normalizeContentBlock(block)).toThrow(/invalid/);
  });
});
