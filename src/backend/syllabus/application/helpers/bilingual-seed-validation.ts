import sanitizeHtml from 'sanitize-html';
import type {
  BilingualSeedOwner,
  BilingualSeedPlan,
  BilingualSeedSkill,
} from '@/backend/syllabus/application/services/prepare-bilingual-seed.service';
import { BilingualContent } from '@/backend/syllabus/domain/value-objects/bilingual-content';
import { PostStudyQuestionBank } from '@/backend/syllabus/domain/value-objects/post-study-question-bank';

export function requireSeed(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function validatePrerequisites(
  skills: BilingualSeedSkill[],
  external: { code: string; isPublished: boolean; prerequisiteSkillCodes: string[] }[],
) {
  const catalog = new Map([...external, ...skills].map((skill) => [skill.code, skill]));
  const visiting = new Set<string>(),
    visited = new Set<string>();

  function visit(code: string) {
    const skill = catalog.get(code);
    requireSeed(skill?.isPublished, `Unavailable prerequisite ${code}.`);
    requireSeed(!visiting.has(code), `Prerequisite cycle ${code}.`);

    if (visited.has(code)) return;

    visiting.add(code);
    skill.prerequisiteSkillCodes.forEach(visit);
    visiting.delete(code);
    visited.add(code);
  }

  skills.filter((skill) => skill.isPublished).forEach((skill) => visit(skill.code));
}

export function validateBilingualPlan(plan: BilingualSeedPlan) {
  const ids = new Set<string>(),
    slugs = new Set<string>(),
    codes = new Set<string>();

  function collection(owners: BilingualSeedOwner[], kind: string) {
    const orders = new Set<number>();

    for (const owner of owners) {
      requireSeed(!ids.has(owner.id), `Duplicate ID ${owner.id}.`);
      ids.add(owner.id);
      requireSeed(!orders.has(owner.sortOrder), `Duplicate order in ${kind}.`);
      orders.add(owner.sortOrder);

      if (typeof owner.slug === 'string') {
        requireSeed(!slugs.has(`${kind}/${owner.slug}`), `Duplicate slug ${owner.slug}.`);
        slugs.add(`${kind}/${owner.slug}`);
      }

      for (const text of Object.values(owner.localizations)) {
        requireSeed(
          text.sourceRevision <= owner.contentRevision,
          `Future translation ${owner.id}.`,
        );
        checkHtml(text);
      }

      if (owner.isPublished)
        requireSeed(BilingualContent.current(owner, 'en'), `Missing current English ${owner.id}.`);
    }
  }

  collection(plan.tracks, 'track');

  for (const track of plan.tracks) {
    collection(track.units, 'unit');
    for (const unit of track.units) {
      requireSeed(
        !unit.isPublished || track.isPublished,
        'Published unit needs a published track.',
      );

      collection(unit.lessons, 'lesson');

      for (const lesson of unit.lessons) {
        requireSeed(
          !lesson.isPublished || unit.isPublished,
          'Published lesson needs a published unit.',
        );

        collection(lesson.skills, 'skill');
        collection(lesson.contentBlocks, 'block');
        collection(lesson.postStudyQuestions, 'question');

        for (const skill of lesson.skills) {
          requireSeed(!codes.has(skill.code), `Duplicate skill code ${skill.code}.`);
          codes.add(skill.code);

          const family = skill.skillType.toLowerCase();

          for (const text of Object.values(skill.localizations)) {
            const content = text.content ?? {};
            requireSeed(
              Object.keys(content).every((key) => key === family || key === 'exampleSentences'),
              `Skill family mismatch ${skill.code}.`,
            );

            const canonicalExamples = skill.content.exampleSentences as
              { provider: string; sentenceId: string | number }[] | undefined;
            const examples = content.exampleSentences as typeof canonicalExamples;
            requireSeed(
              sameKeys(
                canonicalExamples ?? [],
                examples ?? [],
                (e) => `${e.provider}/${e.sentenceId}`,
              ),
              `Example translations mismatch ${skill.code}.`,
            );

            if (family === 'reading') {
              const reading = skill.content.reading as { comprehensionChecks?: { id: string }[] };
              const localized = content.reading as typeof reading;
              requireSeed(
                sameKeys(
                  reading.comprehensionChecks ?? [],
                  localized?.comprehensionChecks ?? [],
                  (c) => c.id,
                ),
                `Reading checks mismatch ${skill.code}.`,
              );
            }
          }
        }

        for (const block of lesson.contentBlocks) {
          const content = block.content as Record<string, unknown>;
          if (block.blockType === 'GRAMMAR_STRUCTURE')
            requireSeed(
              lesson.skills.some(
                (s) => s.isPublished && s.skillType === 'GRAMMAR' && s.code === content.skillCode,
              ),
              `Grammar owner mismatch ${block.id}.`,
            );

          checkHtml(content);
        }

        const questions = lesson.postStudyQuestions.filter((q) => q.isPublished);

        for (const question of lesson.postStudyQuestions) {
          requireSeed(
            lesson.skills.some(
              (s) => s.code === question.skillCode && (!question.isPublished || s.isPublished),
            ),
            `Question skill attribution mismatch ${question.id}.`,
          );

          const prompt = question.promptPayload as Record<string, unknown>;
          requireSeed(
            plain(String(prompt.sentenceTemplateHtml)).replace(/\s/g, '') ===
              String(prompt.sentenceTemplate).replace(/\s/g, ''),
            `Plain/HTML prompt mismatch ${question.id}.`,
          );
          checkHtml(prompt);
        }

        if (lesson.isPublished) {
          requireSeed(
            lesson.contentBlocks.some((b) => b.isPublished),
            `Lesson has no content ${lesson.slug}.`,
          );

          new PostStudyQuestionBank(
            lesson.slug,
            questions.map((q) => ({
              id: q.id,
              skillCode: String(q.skillCode),
              difficultyLevel: Number(q.difficultyLevel),
              questionType: String(q.questionType),
              promptPayload: {
                ...(q.promptPayload as object),
                placeholder: q.localizations.en!.placeholder,
                hintTexts: q.localizations.en!.hintTexts,
              },
              expectedAnswer: q.expectedAnswer as Record<string, unknown>,
              explanation: q.localizations.en!.explanation ?? null,
              sourceRefs: q.sourceRefs as unknown[],
            })),
            lesson.skills.filter((s) => s.isPublished).map((s) => s.code),
            '2.0.0',
          );
        }
      }
    }
  }
}

function sameKeys<T>(a: T[], b: T[], key: (row: T) => string) {
  const keys = b.map(key);

  return (
    a.length === b.length &&
    new Set(keys).size === b.length &&
    a.every((row) => keys.includes(key(row)))
  );
}

export function plain(html: string) {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function checkHtml(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(checkHtml);
    return;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach(checkHtml);
    return;
  }

  if (typeof value !== 'string' || !value.includes('<')) return;

  let unsafe = false;

  sanitizeHtml(value, {
    allowedTags: ['p', 'div', 'span', 'strong', 'br'],
    allowedAttributes: { '*': ['class'] },
    allowedClasses: {
      '*': [
        'text-emphasis',
        'text-warning',
        'question-blank',
        'question-dialogue',
        'question-scenario',
        'question-continuation',
      ],
    },
    exclusiveFilter: (frame) => {
      if (!['p', 'div', 'span', 'strong', 'br'].includes(frame.tag)) unsafe = true;
      return false;
    },
    onOpenTag: (_tag, attrs) => {
      if (
        Object.entries(attrs).some(
          ([key, val]) =>
            key !== 'class' ||
            ![
              'text-emphasis',
              'text-warning',
              'question-blank',
              'question-dialogue',
              'question-scenario',
              'question-continuation',
            ].includes(val),
        )
      )
        unsafe = true;
    },
  });

  requireSeed(!unsafe && !/<!--|<!DOCTYPE|<\?/i.test(value), 'Unsafe content HTML.');
}
