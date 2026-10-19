import { z } from 'zod';

export const paginationRequestSchema = z.object({
  offset: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(0).max(Number.MAX_SAFE_INTEGER))
    .default(0),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .default(10),
});

export type PaginationRequestDto = z.infer<typeof paginationRequestSchema>;
