import { http, HttpResponse } from 'msw';
import type { ProgressSourceType } from '@/frontend/progress/interfaces/entities';
import {
  mockProgressOverview,
  mockProgressRecords,
  mockProgressSessions,
} from '@/mocks/states/progress';
import { getMockSession } from '@/mocks/states/session';

function status(code = 120007000, message = 'Success!') {
  return { traceId: crypto.randomUUID(), code, message, errorDetails: [] };
}

function guard() {
  const session = getMockSession();

  if (!session.isAuthenticated || !session.user)
    return HttpResponse.json(
      { status: status(140107001, 'Your session expired. Sign in again to continue.') },
      { status: 401 },
    );

  if (session.authorization.appAccess !== 'APP_READY')
    return HttpResponse.json(
      { status: status(140307001, 'Finish onboarding to view progress.') },
      { status: 403 },
    );

  return null;
}

function query(request: Request) {
  const search = new URL(request.url).searchParams;
  const keys = ['trackSlug', 'sourceTypes', 'skillCodes', 'offset', 'limit'];

  if (keys.some((key) => search.getAll(key).length > 1)) return null;

  const trackSlug = search.get('trackSlug') ?? undefined;
  const sourceTypes = search.has('sourceTypes') ? search.get('sourceTypes')!.split(',') : undefined;
  const skillCodes = search.has('skillCodes') ? search.get('skillCodes')!.split(',') : undefined;

  const offsetText = search.get('offset') ?? '0';
  const limitText = search.get('limit') ?? '10';
  const offset = Number(offsetText);
  const limit = Number(limitText);

  if (
    (trackSlug !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trackSlug)) ||
    sourceTypes?.some(
      (source) => !['FLASHCARD', 'PRACTICE', 'LESSON_POST_STUDY'].includes(source),
    ) ||
    skillCodes?.some((code) => !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(code)) ||
    !/^\d+$/.test(offsetText) ||
    !/^\d+$/.test(limitText) ||
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    return null;

  return {
    trackSlug,
    sourceTypes: sourceTypes as ProgressSourceType[] | undefined,
    skillCodes,
    offset,
    limit,
  };
}

const invalid = () =>
  HttpResponse.json(
    { status: status(142207001, 'Choose a valid progress filter.') },
    { status: 422 },
  );

export const progressHandlers = [
  http.get('*/api/v1/progress/overview', ({ request }) => {
    const denied = guard();
    if (denied) return denied;

    const parsed = query(request);
    if (!parsed) return invalid();

    return HttpResponse.json({
      status: status(),
      data: mockProgressOverview(getMockSession().user!.id, parsed.trackSlug),
    });
  }),

  ...(['sessions', 'timeline'] as const).map((feed) =>
    http.get(`*/api/v1/progress/${feed}`, ({ request }) => {
      const denied = guard();
      if (denied) return denied;

      const parsed = query(request);
      if (!parsed) return invalid();

      const records = mockProgressRecords(getMockSession().user!.id, parsed.trackSlug)
        .filter(
          (record) => !parsed.sourceTypes || parsed.sourceTypes.includes(record.event.sourceType),
        )
        .filter(
          (record) =>
            feed !== 'timeline' ||
            !parsed.skillCodes ||
            parsed.skillCodes.includes(record.event.skillCode),
        );

      const items =
        feed === 'sessions' ? mockProgressSessions(records) : records.map((record) => record.event);

      return HttpResponse.json({
        status: status(),
        metadata: {
          pagination: {
            pageNumber: Math.floor(parsed.offset / parsed.limit) + 1,
            pageSize: parsed.limit,
            totalRecords: items.length,
          },
        },
        data: {
          [feed === 'sessions' ? 'progressSessions' : 'progressEvents']: items.slice(
            parsed.offset,
            parsed.offset + parsed.limit,
          ),
        },
      });
    }),
  ),
];
