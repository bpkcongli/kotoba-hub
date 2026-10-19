import type {
  PublishedOnboardingTrack,
  SyllabusCatalogPort,
} from '@/backend/personalization/application/ports/syllabus-catalog.port';
import type { SyllabusCatalogService } from '@/backend/syllabus/application/services/syllabus-catalog.service';

export class SyllabusCatalogAdapter implements SyllabusCatalogPort {
  constructor(private readonly syllabus: SyllabusCatalogService) {}

  getPublishedOnboardingTracks(): Promise<PublishedOnboardingTrack[]> {
    return this.syllabus.getPublishedOnboardingTracks();
  }
}
