import { paginationRequestSchema } from '@/backend/shared/interface/primary/rest/dto/pagination.request.dto';

describe('shared pagination query validation', () => {
  it('defaults omitted query parameters to offset zero and limit ten', () => {
    expect(paginationRequestSchema.parse({})).toEqual({ offset: 0, limit: 10 });
  });

  it('parses decimal query strings at the supported boundaries', () => {
    expect(paginationRequestSchema.parse({ offset: '0', limit: '1' })).toEqual({
      offset: 0,
      limit: 1,
    });
    expect(
      paginationRequestSchema.parse({ offset: String(Number.MAX_SAFE_INTEGER), limit: '100' }),
    ).toEqual({ offset: Number.MAX_SAFE_INTEGER, limit: 100 });
  });

  it.each([
    { offset: '' },
    { offset: ' ' },
    { offset: '-1' },
    { offset: '1.5' },
    { offset: '1e2' },
    { offset: '0x10' },
    { offset: String(Number.MAX_SAFE_INTEGER + 1) },
    { offset: '\u0000' },
    { limit: '' },
    { limit: '0' },
    { limit: '101' },
    { limit: '1.5' },
  ])('rejects malformed or out-of-range pagination: %j', (query) => {
    expect(paginationRequestSchema.safeParse(query).success).toBe(false);
  });
});
