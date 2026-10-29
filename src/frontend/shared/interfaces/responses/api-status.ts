import { z } from 'zod';

export const apiStatusSchema = z.object({
  traceId: z.string().min(1),
  code: z.number().int().min(100000000).max(999999999),
  message: z.string().min(1),
  errorDetails: z.array(z.object({ field: z.string(), message: z.string() })),
});

export const errorEnvelopeSchema = z.object({ status: apiStatusSchema });
export const authSuccessStatusSchema = apiStatusSchema.extend({ code: z.literal(120001000) });
