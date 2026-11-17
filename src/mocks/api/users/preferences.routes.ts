import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import { getMockPreferences, patchMockPreferences } from '@/mocks/states/locale';
import { getMockSession } from '@/mocks/states/session';
import { localeSchema } from '@/shared/locale';

const schema = z
  .strictObject({ contentLocale: localeSchema.optional(), uiLocale: localeSchema.optional() })
  .refine((v) => Object.keys(v).length > 0);

function response(code: number, data?: unknown, status = 200) {
  return HttpResponse.json(
    {
      status: {
        traceId: crypto.randomUUID(),
        code,
        message: status === 200 ? 'Success!' : 'Invalid preferences.',
        errorDetails: [],
      },
      ...(data ? { data } : {}),
    },
    { status },
  );
}

export const preferencesHandlers = [
  http.get('*/api/v1/user-profile/preferences', () =>
    getMockSession().isAuthenticated
      ? response(120002000, getMockPreferences())
      : response(140102001, undefined, 401),
  ),
  http.patch('*/api/v1/user-profile/preferences', async ({ request }) => {
    if (!getMockSession().isAuthenticated) return response(140102001, undefined, 401);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    return parsed.success
      ? response(120002000, patchMockPreferences(parsed.data))
      : response(142202001, undefined, 422);
  }),
];
