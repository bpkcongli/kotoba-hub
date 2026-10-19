import type { SyllabusTrackSnapshot } from '@/backend/syllabus/domain/repositories/syllabus-catalog.repository';

export interface SyllabusSeedPlan {
  tracks: SyllabusTrackSnapshot[];
  counts: {
    tracks: number;
    units: number;
    lessons: number;
    skills: number;
    contentBlocks: number;
    questions: number;
    mappings: number;
  };
  rejectedLessons: { slug: string; reason: string }[];
}

export interface PrepareSyllabusSeedService {
  prepare(): Promise<SyllabusSeedPlan>;
}
