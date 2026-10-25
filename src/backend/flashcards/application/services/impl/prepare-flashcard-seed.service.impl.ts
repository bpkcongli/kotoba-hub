import { createHash } from 'node:crypto';
import type { CanonicalFlashcardSource } from '@/backend/flashcards/application/ports/canonical-flashcard-source.port';
import type { FlashcardSeedCatalogPort } from '@/backend/flashcards/application/ports/flashcard-seed-catalog.port';
import type {
  FlashcardSeedItem,
  FlashcardSeedPlan,
  PrepareFlashcardSeedService,
  SeedScriptMode,
} from '@/backend/flashcards/application/services/prepare-flashcard-seed.service';

export function stableFlashcardSeedId(key: string): string {
  const bytes = createHash('sha256')
    .update(`kotobahub/flashcards/v1/${key}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export class PrepareFlashcardSeedServiceImpl implements PrepareFlashcardSeedService {
  constructor(
    private readonly catalog: FlashcardSeedCatalogPort,
    private readonly source: CanonicalFlashcardSource,
  ) {}

  async prepare(): Promise<FlashcardSeedPlan> {
    const [catalog, artifacts, kanjiSkills] = await Promise.all([
      this.catalog.getPublishedCatalog(),
      this.source.readArtifacts(),
      this.source.readKanjiSkills(),
    ]);

    const plan: FlashcardSeedPlan = {
      decks: [],
      items: [],
      deckItems: [],
      counts: { decks: 0, items: 0, memberships: 0, mappedItems: 0, pendingItems: 0 },
    };

    const publishedSkill = new Map(catalog.skills.map((skill) => [skill.code, skill]));
    const publishedUnit = new Map(catalog.units.map((unit) => [unit.slug, unit]));
    const itemIds = new Set<string>();
    const deckIds = new Set<string>();

    for (const artifact of artifacts) {
      const sourceDecks = new Map(artifact.decks.map((deck) => [deck.id, deck]));
      const sourceItems = new Map(artifact.items.map((item) => [item.id, item]));

      for (const member of artifact.deckItems) {
        const deck = sourceDecks.get(member.deckId);
        const item = sourceItems.get(member.itemId);
        if (
          !deck ||
          !item ||
          deck.trackSlug !== item.trackSlug ||
          deck.unitSlug !== item.unitSlug ||
          (deck.lessonSlug && deck.lessonSlug !== item.lessonSlug)
        ) {
          throw new Error(
            `Canonical flashcard membership ownership mismatch for ${member.itemId}.`,
          );
        }
      }

      const eligible = new Set<string>();

      for (const item of artifact.items) {
        if (itemIds.has(item.id)) throw new Error(`Duplicate canonical flashcard item ${item.id}.`);

        itemIds.add(item.id);
        if (!item.isActive) continue;

        const skill = publishedSkill.get(item.skillCode);
        const pending = item.mappingStatus === 'PENDING_LESSON_MAPPING';
        if (pending) {
          if (item.skillId !== null || item.lessonSlug !== null || item.unitSlug !== null)
            throw new Error(`Pending item ${item.id} has official attribution.`);
          if (
            !catalog.tracks.some(
              (track) => track.slug === item.trackSlug && track.curriculumLevel === 'N5',
            )
          )
            continue;
        } else {
          if (!skill) continue;
          if (
            skill.id !== item.skillId ||
            skill.lessonSlug !== item.lessonSlug ||
            skill.unitSlug !== item.unitSlug ||
            skill.trackSlug !== item.trackSlug
          )
            throw new Error(`Canonical flashcard attribution mismatch for ${item.id}.`);
        }

        const family =
          item.itemType === 'VOCABULARY'
            ? 'VOCABULARY'
            : item.itemType === 'KANJI_CHARACTER'
              ? 'KANJI'
              : 'KANA';
        if (family !== artifact.contentType || (skill && skill.skillType !== family))
          throw new Error(`Flashcard family mismatch for ${item.id}.`);

        eligible.add(item.id);
        const answerOptionPayload: FlashcardSeedItem['answerOptionPayload'] = {};

        for (const [mode, answers] of Object.entries(item.answerOptionPayload.canonicalAnswers)) {
          if (answers)
            answerOptionPayload[mode as SeedScriptMode] = {
              canonicalAnswer: answers[0],
              distractors: [],
            };
        }

        plan.items.push({
          id: item.id,
          skillId: pending ? null : skill!.id,
          itemType: item.itemType,
          surfaceFormText: item.surfaceFormText,
          kanaDisplayText: item.kanaDisplayText,
          romajiText: item.romajiText,
          englishMeaning: item.englishMeaning,
          onyomiReadings: null,
          kunyomiReadings: null,
          exampleWords: null,
          answerOptionPayload,
          explanationText: item.explanationText,
          isActive: true,
        });
      }

      for (const deck of artifact.decks) {
        if (deckIds.has(deck.id)) throw new Error(`Duplicate canonical flashcard deck ${deck.id}.`);

        deckIds.add(deck.id);
        if (!deck.isPublished || !catalog.tracks.some((track) => track.slug === deck.trackSlug))
          continue;

        const unit = deck.unitSlug ? publishedUnit.get(deck.unitSlug) : null;
        if (deck.unitSlug && !unit) continue;
        if (unit && unit.trackSlug !== deck.trackSlug)
          throw new Error(`Deck ${deck.id} has invalid track ownership.`);

        const memberships = artifact.deckItems
          .filter((row) => row.deckId === deck.id && eligible.has(row.itemId))
          .sort((a, b) => a.sortOrder - b.sortOrder);
        if (!memberships.length) continue;
        if (new Set(memberships.map((row) => row.itemId)).size !== memberships.length)
          throw new Error(`Deck ${deck.id} has duplicate members.`);

        plan.decks.push({
          id: deck.id,
          slug: deck.slug,
          unitId: unit?.id ?? null,
          title: deck.title,
          description: deck.description,
          deckSource: 'SYSTEM',
          deckType: 'FOUNDATION',
          contentType: artifact.contentType,
          sortOrder: deck.sortOrder,
          isPublished: true,
        });
        plan.deckItems.push(
          ...memberships.map((row, index) => ({
            deckId: deck.id,
            itemId: row.itemId,
            sortOrder: index + 1,
          })),
        );
      }
    }

    const kanjiDecks = new Map<string, FlashcardSeedPlan['decks'][number]>();

    for (const raw of kanjiSkills) {
      const skill = publishedSkill.get(raw.code);
      if (!skill) continue;
      if (
        skill.id !== raw.id ||
        skill.trackSlug !== raw.trackSlug ||
        skill.unitSlug !== raw.unitSlug ||
        skill.lessonSlug !== raw.lessonSlug ||
        skill.skillType !== 'KANJI'
      )
        throw new Error(`Kanji attribution mismatch for ${raw.code}.`);

      let deck = kanjiDecks.get(raw.unitSlug);
      if (!deck) {
        deck = {
          id: stableFlashcardSeedId(`deck/${raw.unitSlug}/KANJI`),
          slug: `${raw.unitSlug}-kanji-foundation`,
          unitId: publishedUnit.get(raw.unitSlug)!.id,
          title: `${raw.unitSlug.toUpperCase().replaceAll('-', ' ')} Kanji`,
          description: null,
          deckSource: 'SYSTEM',
          deckType: 'FOUNDATION',
          contentType: 'KANJI',
          sortOrder: 1,
          isPublished: true,
        };
        kanjiDecks.set(raw.unitSlug, deck);
        plan.decks.push(deck);
      }

      const id = stableFlashcardSeedId(`item/${skill.id}/KANJI`);
      const kana = [...raw.onyomi, ...raw.kunyomi].join(' / ');
      if (!kana) throw new Error(`Kanji ${raw.code} has no canonical reading.`);

      plan.items.push({
        id,
        skillId: skill.id,
        itemType: 'KANJI_CHARACTER',
        surfaceFormText: raw.literal,
        kanaDisplayText: kana,
        romajiText: null,
        englishMeaning: raw.meaningsEn.join(' / '),
        onyomiReadings: raw.onyomi,
        kunyomiReadings: raw.kunyomi,
        exampleWords: [],
        answerOptionPayload: {
          KANJI: { canonicalAnswer: raw.literal, distractors: [] },
          KANA: { canonicalAnswer: kana, distractors: [] },
          ENGLISH: { canonicalAnswer: raw.meaningsEn.join(' / '), distractors: [] },
        },
        explanationText: null,
        isActive: true,
      });
      plan.deckItems.push({
        deckId: deck.id,
        itemId: id,
        sortOrder: plan.deckItems.filter((row) => row.deckId === deck.id).length + 1,
      });
    }

    // Canonical artifacts keep aliases; every alias is excluded from distractors.
    const aliases = new Map(
      artifacts
        .flatMap((artifact) => artifact.items)
        .map((item) => [item.id, item.answerOptionPayload.canonicalAnswers]),
    );

    for (const raw of kanjiSkills) {
      const id = stableFlashcardSeedId(`item/${raw.id}/KANJI`);
      aliases.set(id, {
        KANJI: [raw.literal],
        KANA: [...raw.onyomi, ...raw.kunyomi, [...raw.onyomi, ...raw.kunyomi].join(' / ')],
        ENGLISH: [...raw.meaningsEn, raw.meaningsEn.join(' / ')],
      });
    }

    const aliasesFor = (item: FlashcardSeedItem, mode: SeedScriptMode) =>
      new Set(
        (aliases.get(item.id)?.[mode] ?? [item.answerOptionPayload[mode]?.canonicalAnswer ?? ''])
          .map(normalize)
          .filter(Boolean),
      );

    const hasSharedPrompt = (item: FlashcardSeedItem, other: FlashcardSeedItem) =>
      Object.keys(item.answerOptionPayload).some((mode) => {
        const current = aliasesFor(item, mode as SeedScriptMode);

        return [...aliasesFor(other, mode as SeedScriptMode)].some((alias) => current.has(alias));
      });

    const rawItems = new Map(
      artifacts.flatMap((artifact) => artifact.items).map((item) => [item.id, item]),
    );

    for (const item of plan.items) {
      for (const [mode, payload] of Object.entries(item.answerOptionPayload)) {
        if (!payload) continue;

        const invalid = new Set(
          (aliases.get(item.id)?.[mode as SeedScriptMode] ?? [payload.canonicalAnswer]).map(
            normalize,
          ),
        );
        const candidates = plan.items.filter(
          (other) =>
            other.itemType === item.itemType &&
            other.id !== item.id &&
            !hasSharedPrompt(item, other),
        );
        const preferred = rawItems.get(item.id)?.answerOptionPayload.distractorPoolItemIds ?? [];
        candidates.sort(
          (a, b) => Number(preferred.includes(b.id)) - Number(preferred.includes(a.id)),
        );

        const seen = new Set<string>();

        payload.distractors = candidates
          .flatMap((other) => {
            const value = other.answerOptionPayload[mode as SeedScriptMode]?.canonicalAnswer;
            if (!value || invalid.has(normalize(value)) || seen.has(normalize(value))) return [];

            seen.add(normalize(value));

            return [value];
          })
          .slice(0, 30);
      }
    }

    // Deck ordering spans content families within each unit.
    const unitOrders = new Map<string, number>();

    for (const deck of plan.decks) {
      const key = deck.unitId ?? 'track-scoped';
      const order = (unitOrders.get(key) ?? 0) + 1;
      unitOrders.set(key, order);
      deck.sortOrder = order;
    }

    const memberIds = new Set(plan.deckItems.map((row) => row.itemId));
    plan.items = plan.items.filter((item) => memberIds.has(item.id));

    plan.counts = {
      decks: plan.decks.length,
      items: plan.items.length,
      memberships: plan.deckItems.length,
      mappedItems: plan.items.filter((item) => item.skillId !== null).length,
      pendingItems: plan.items.filter((item) => item.skillId === null).length,
    };

    return plan;
  }
}

function normalize(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase();
}
