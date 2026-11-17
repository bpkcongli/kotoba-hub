import type {
  SyllabusTrackSnapshot,
  SyllabusLessonSnapshot,
} from '@/backend/syllabus/domain/repositories/syllabus-catalog.repository';
import {
  BilingualContent,
  translationText,
  type BilingualOwner,
} from '@/backend/syllabus/domain/value-objects/bilingual-content';
import { PostStudyQuestionBank } from '@/backend/syllabus/domain/value-objects/post-study-question-bank';
import type { Locale } from '@/shared/locale';

function eligible(owner: BilingualOwner) {
  return owner.seedSchemaVersion === '2.0.0' && Boolean(BilingualContent.current(owner, 'en'));
}

function lessonEligible(lesson: SyllabusLessonSnapshot) {
  try {
    new PostStudyQuestionBank(
      lesson.slug,
      lesson.postStudyQuestions ?? [],
      lesson.skills.filter((s) => s.isPublished).map((s) => s.code),
      '2.0.0',
    );
  } catch {
    return false;
  }

  return (
    eligible(lesson) &&
    lesson.contentBlocks.some((block) => block.isPublished) &&
    lesson.skills.filter((s) => s.isPublished).every(eligible) &&
    lesson.contentBlocks.filter((b) => b.isPublished).every(eligible) &&
    lesson.postStudyQuestions?.length === 10 &&
    lesson.postStudyQuestions.every(eligible)
  );
}

function metadata<T extends BilingualOwner>(owner: T, locale: Locale): T {
  const { text, localization } = BilingualContent.resolve(owner, locale);

  return { ...owner, ...translationText(text), localization };
}

export function localizeSyllabus(
  tracks: SyllabusTrackSnapshot[],
  locale: Locale,
): SyllabusTrackSnapshot[] {
  return tracks
    .filter((t) => t.isPublished && eligible(t))
    .flatMap((track) => {
      const units = track.units
        .filter((u) => u.isPublished && eligible(u))
        .flatMap((unit) => {
          const lessons = unit.lessons
            .filter((l) => l.isPublished && lessonEligible(l))
            .map((lesson) => ({
              ...metadata(lesson, locale),
              skills: lesson.skills
                .filter((s) => s.isPublished)
                .map((skill) => metadata(skill, locale)),
              contentBlocks: lesson.contentBlocks
                .filter((b) => b.isPublished)
                .map((block) => {
                  const { text, localization } = BilingualContent.resolve(block, locale);
                  const canonical =
                    block.blockType === 'EXAMPLE_SENTENCE'
                      ? { japaneseSentence: block.content?.japaneseSentence }
                      : block.blockType === 'GRAMMAR_STRUCTURE'
                        ? { skillCode: block.content?.skillCode }
                        : {};

                  return {
                    ...block,
                    content: { ...canonical, ...translationText(text) },
                    localization,
                  };
                }),
              postStudyQuestions: lesson.postStudyQuestions!.map((question) => {
                const { text, localization } = BilingualContent.resolve(question, locale);
                const { placeholder, hintTexts, ...canonical } = question.promptPayload;

                void placeholder;
                void hintTexts;

                return {
                  ...question,
                  promptPayload: {
                    ...canonical,
                    placeholder: text.placeholder ?? null,
                    hintTexts: text.hintTexts ?? [],
                  },
                  explanation: text.explanation ?? null,
                  localization,
                };
              }),
            }));

          const slugs = new Set(lessons.map((l) => l.slug));

          return lessons.length
            ? [
                {
                  ...metadata(unit, locale),
                  lessons,
                  unitSkillMappings: unit.unitSkillMappings?.filter((m) => slugs.has(m.lessonSlug)),
                },
              ]
            : [];
        });

      return units.length ? [{ ...metadata(track, locale), units }] : [];
    });
}

export function localizedCutoverBlockers(tracks: SyllabusTrackSnapshot[]): string[] {
  const visible = new Set(
    localizeSyllabus(tracks, 'en').flatMap((t) =>
      t.units.flatMap((u) => u.lessons.map((l) => l.id)),
    ),
  );

  return tracks
    .filter((t) => t.isPublished)
    .flatMap((t) =>
      t.units
        .filter((u) => u.isPublished)
        .flatMap((u) =>
          u.lessons.filter((l) => l.isPublished && !visible.has(l.id)).map((l) => l.slug),
        ),
    );
}
