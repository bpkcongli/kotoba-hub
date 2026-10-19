import { z } from 'zod';
import type { SyllabusContentBlockSnapshot } from '@/backend/syllabus/domain/repositories/syllabus-catalog.repository';

const nonEmptyText = z.string().refine((value) => value.trim().length > 0);
const payloadSchemas = {
  PARAGRAPH: z.object({ title: z.string().optional(), body: nonEmptyText }).strict(),
  EXAMPLE_SENTENCE: z
    .object({ japaneseSentence: nonEmptyText, englishTranslation: nonEmptyText })
    .strict(),
  GRAMMAR_STRUCTURE: z
    .object({
      skillCode: nonEmptyText,
      ALL: z.string().nullable().optional(),
      STANDARD: z.string().nullable().optional(),
      POLITE: z.string().nullable().optional(),
    })
    .strict()
    .refine((content) =>
      [content.ALL, content.STANDARD, content.POLITE].some(
        (value) => typeof value === 'string' && value.trim().length > 0,
      ),
    ),
};

export function normalizeContentBlock(
  block: SyllabusContentBlockSnapshot,
): SyllabusContentBlockSnapshot {
  if (block.content !== undefined) {
    const schema = payloadSchemas[block.blockType as keyof typeof payloadSchemas];

    if (!schema?.safeParse(block.content).success) {
      throw new Error(`Syllabus content block ${block.id} has invalid ${block.blockType} content.`);
    }

    return block;
  }

  if (block.blockType !== 'PARAGRAPH' || typeof block.body !== 'string' || !block.body.trim()) {
    throw new Error(`Syllabus content block ${block.id} has no usable content.`);
  }

  const body = block.body.trimStart().startsWith('<')
    ? block.body
    : `<p>${block.body.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</p>`;

  return normalizeContentBlock({
    ...block,
    content: { ...(block.title ? { title: block.title } : {}), body },
  });
}
