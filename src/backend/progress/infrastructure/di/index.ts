import { ProgressCatalogPort } from '@/backend/progress/application/ports/progress-catalog.port';
import { LearningContextServiceImpl } from '@/backend/progress/application/services/impl/learning-context.service.impl';
import { ProgressServiceImpl } from '@/backend/progress/application/services/impl/progress.service.impl';
import type { LearningContextService } from '@/backend/progress/application/services/learning-context.service';
import type { ProgressService } from '@/backend/progress/application/services/progress.service';
import { progressRepository } from '@/backend/progress/interface/secondary/persistence/drizzle-progress.repository';
import { ProgressCatalogAdapter } from '@/backend/progress/interface/secondary/syllabus/progress-catalog.adapter';
import { syllabusCatalogService } from '@/backend/syllabus/infrastructure/di';

export const progressCatalogAdapter: ProgressCatalogPort = new ProgressCatalogAdapter(
  syllabusCatalogService,
);

export const progressService: ProgressService = new ProgressServiceImpl(
  progressRepository,
  progressCatalogAdapter,
);

export const learningContextService: LearningContextService = new LearningContextServiceImpl(
  progressRepository,
);
