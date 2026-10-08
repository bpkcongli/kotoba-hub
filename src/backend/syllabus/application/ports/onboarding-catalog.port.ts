export interface PublishedOnboardingTrack {
  slug: string;
  curriculumLevel: string;
  sortOrder: number;
  units: {
    slug: string;
    sortOrder: number;
    lessons: {
      slug: string;
      sortOrder: number;
      skillCodes: string[];
    }[];
  }[];
}

export interface OnboardingCatalogPort {
  getPublishedTracks(): PublishedOnboardingTrack[];
}
