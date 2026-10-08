import type {
  OnboardingCatalogPort,
  PublishedOnboardingTrack,
} from '@/backend/syllabus/application/ports/onboarding-catalog.port';
import manifest from '../../../../../../content/syllabus/manifest.json';
import n4Seed from '../../../../../../content/syllabus/tracks/jlpt-n4-expansion.json';
import n5Seed from '../../../../../../content/syllabus/tracks/jlpt-n5-foundation.json';

interface SeedTrack {
  slug: string;
  curriculumLevel: string;
  isPublished: boolean;
  units: {
    slug: string;
    sortOrder: number;
    isPublished: boolean;
    lessons: {
      slug: string;
      sortOrder: number;
      isPublished: boolean;
      skills: { code: string; isPublished: boolean }[];
    }[];
  }[];
}

const trackSeeds: Record<string, SeedTrack> = {
  [n5Seed.track.slug]: n5Seed.track,
  [n4Seed.track.slug]: n4Seed.track,
};

export class SeedOnboardingCatalog implements OnboardingCatalogPort {
  getPublishedTracks(): PublishedOnboardingTrack[] {
    return manifest.tracks.flatMap((entry) => {
      const track = trackSeeds[entry.slug];
      if (!entry.isPublished || !track?.isPublished) return [];

      return [
        {
          slug: track.slug,
          curriculumLevel: track.curriculumLevel,
          sortOrder: entry.sortOrder,
          units: track.units
            .filter((unit) => unit.isPublished)
            .map((unit) => ({
              slug: unit.slug,
              sortOrder: unit.sortOrder,
              lessons: unit.lessons
                .filter((lesson) => lesson.isPublished)
                .map((lesson) => ({
                  slug: lesson.slug,
                  sortOrder: lesson.sortOrder,
                  skillCodes: lesson.skills
                    .filter((skill) => skill.isPublished)
                    .map((skill) => skill.code),
                })),
            })),
        },
      ];
    });
  }
}

export const onboardingCatalog = new SeedOnboardingCatalog();
