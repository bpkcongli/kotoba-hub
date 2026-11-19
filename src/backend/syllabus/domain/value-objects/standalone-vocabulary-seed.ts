import { z } from 'zod';

const translation = z.strictObject({
  title: z.string().trim().min(1).max(255),
  description: z.string().nullable(),
  sourceRevision: z.number().int().positive(),
  translationRevision: z.number().int().positive(),
  isPublished: z.boolean(),
  sourceRefs: z.array(z.string().min(1)).min(1),
});

export const standaloneVocabularySeedSchema = z.strictObject({
  schemaVersion: z.literal('2.0.0'),
  kind: z.literal('STANDALONE_VOCABULARY_GROUPS'),
  groups: z
    .array(
      z.strictObject({
        id: z.uuid(),
        code: z
          .string()
          .regex(/^[a-z][a-z0-9_]*$/)
          .max(100),
        slug: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .max(100),
        trackSlug: z.string().min(1),
        curriculumLevel: z.enum(['N5', 'N4']),
        sortOrder: z.number().int().positive(),
        contentRevision: z.number().int().positive(),
        isPublished: z.boolean(),
        sourceRefs: z.array(z.string().min(1)).min(1),
        items: z
          .array(z.strictObject({ itemId: z.uuid(), pendingSkillCode: z.string().min(1) }))
          .min(1),
        localizations: z.strictObject({ en: translation, id: translation.optional() }),
      }),
    )
    .min(1),
});

export type StandaloneVocabularyManifest = z.infer<typeof standaloneVocabularySeedSchema>;
export type VocabularyGroupSeed = StandaloneVocabularyManifest['groups'][number];

export interface PendingVocabularyIdentity {
  id: string;
  skillCode: string;
  skillId: string | null;
  itemType: string;
  trackSlug: string;
  mappingStatus: string;
}

export class StandaloneVocabularySeed {
  readonly manifest: StandaloneVocabularyManifest;

  constructor(input: unknown, inventory: PendingVocabularyIdentity[]) {
    this.manifest = standaloneVocabularySeedSchema.parse(input);

    const identities = new Set<string>();
    const members = new Set<string>();

    for (const group of this.manifest.groups) {
      for (const key of ['id', 'code', 'slug'] as const) {
        const identity = `${key}:${group[key]}`;

        if (identities.has(identity)) throw new Error('Duplicate vocabulary group identity.');

        identities.add(identity);
      }

      for (const item of group.items) {
        const baseline = inventory.find((entry) => entry.id === item.itemId);

        if (
          members.has(item.itemId) ||
          !baseline ||
          baseline.itemType !== 'VOCABULARY' ||
          baseline.mappingStatus !== 'PENDING_LESSON_MAPPING' ||
          baseline.skillId !== null ||
          baseline.skillCode !== item.pendingSkillCode ||
          baseline.trackSlug !== group.trackSlug
        )
          throw new Error(`Invalid pending vocabulary identity: ${item.itemId}.`);

        members.add(item.itemId);
      }

      for (const [locale, value] of Object.entries(group.localizations)) {
        if (
          value.sourceRevision > group.contentRevision ||
          (locale === 'en' && value.sourceRevision !== group.contentRevision)
        )
          throw new Error(`Stale vocabulary group translation: ${group.code}.`);
      }

      if (group.isPublished && !group.localizations.en.isPublished)
        throw new Error(`Published vocabulary group requires current English: ${group.code}.`);
    }
  }
}

export function assertVocabularyGroupRevision(
  previous: VocabularyGroupSeed,
  next: VocabularyGroupSeed,
): void {
  for (const key of ['id', 'code', 'slug', 'trackSlug', 'curriculumLevel'] as const)
    if (previous[key] !== next[key]) throw new Error('Vocabulary group identity is immutable.');

  if (canonicalJson(previous.items) !== canonicalJson(next.items))
    throw new Error('Vocabulary group membership is immutable.');

  if (next.contentRevision < previous.contentRevision)
    throw new Error('Vocabulary group revision moved backwards.');

  if (
    next.contentRevision === previous.contentRevision &&
    canonicalJson(previous.sourceRefs) !== canonicalJson(next.sourceRefs)
  )
    throw new Error('Vocabulary group source changed without a revision.');

  for (const locale of ['en', 'id'] as const) {
    const before = previous.localizations[locale];
    const after = next.localizations[locale];

    if (!before) continue;

    if (
      !after ||
      after.translationRevision < before.translationRevision ||
      after.sourceRevision < before.sourceRevision
    )
      throw new Error('Vocabulary group translation revision moved backwards.');

    const payload = (value: typeof before) => ({ ...value, isPublished: undefined });

    if (
      locale === 'en' &&
      next.contentRevision === previous.contentRevision &&
      canonicalJson(payload(before)) !== canonicalJson(payload(after))
    )
      throw new Error('Vocabulary group English changed without a canonical revision.');

    if (
      after.translationRevision === before.translationRevision &&
      canonicalJson(payload(before)) !== canonicalJson(payload(after))
    )
      throw new Error('Vocabulary group translation changed without a revision.');
  }
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, entry: unknown) =>
    entry && typeof entry === 'object' && !Array.isArray(entry)
      ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)))
      : entry,
  );
}
