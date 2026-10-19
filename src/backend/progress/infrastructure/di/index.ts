import { ProgressCatalogPort } from '@/backend/progress/application/ports/progress-catalog.port';
import { ProgressServiceImpl } from '@/backend/progress/application/services/impl/progress.service.impl';
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
