import { PrepareSyllabusSeedServiceImpl } from '@/backend/syllabus/application/services/impl/prepare-syllabus-seed.service.impl';
import { SyllabusCatalogServiceImpl } from '@/backend/syllabus/application/services/impl/syllabus-catalog.service.impl';
import type { PrepareSyllabusSeedService } from '@/backend/syllabus/application/services/prepare-syllabus-seed.service';
import type { SyllabusCatalogService } from '@/backend/syllabus/application/services/syllabus-catalog.service';
import { DrizzleSyllabusCatalogRepository } from '@/backend/syllabus/interface/secondary/persistence/drizzle-syllabus-catalog.repository';
import { SeedSyllabusCatalogRepository } from '@/backend/syllabus/interface/secondary/seed/seed-syllabus-catalog.repository';

export const drizzleSyllabusCatalogRepository = new DrizzleSyllabusCatalogRepository();

export const seedSyllabusCatalogRepository = new SeedSyllabusCatalogRepository();

export const syllabusCatalogService: SyllabusCatalogService = new SyllabusCatalogServiceImpl(
  drizzleSyllabusCatalogRepository,
);

export const prepareSyllabusSeedService: PrepareSyllabusSeedService =
  new PrepareSyllabusSeedServiceImpl(seedSyllabusCatalogRepository);
