import { http, HttpResponse } from 'msw';
import {
  syllabusTracksFixture,
  syllabusUnitFixture,
  syllabusLessonFixture,
} from '@/mocks/fixtures/syllabus';
import { getMockSession } from '@/mocks/states/session';

function status(code: number, message = 'Success!') {
  return { traceId: crypto.randomUUID(), code, message, errorDetails: [] };
}

function guard(ready = true) {
  const session = getMockSession();

  if (!session.isAuthenticated)
    return HttpResponse.json(
      {
        status: status(140104001, 'Your session expired. Sign in again to continue.'),
      },
      { status: 401 },
    );
  if (ready && session.authorization.appAccess !== 'APP_READY')
    return HttpResponse.json(
      { status: status(140304001, 'Finish onboarding before opening lessons.') },
      { status: 403 },
    );

  return null;
}

export const syllabusHandlers = [
  http.get('*/api/v1/syllabus', ({ request }) => {
    const denied = guard(false);
    if (denied) return denied;

    const url = new URL(request.url);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 10);
    const includeUnits = url.searchParams.get('includeUnits') ?? 'false';

    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      !['true', 'false'].includes(includeUnits)
    )
      return HttpResponse.json(
        { status: status(142204001, 'Invalid syllabus query.') },
        { status: 422 },
      );

    const levels = url.searchParams.get('curriculumLevels')?.split(',');
    const tracks = syllabusTracksFixture().filter(
      (t) => !levels || levels.includes(t.curriculumLevel),
    );

    return HttpResponse.json({
      status: status(120004000),
      data: {
        tracks: tracks.slice(offset, offset + limit).map((t) => {
          if (includeUnits === 'true') return t;

          const { units, ...summary } = t;

          void units;

          return summary;
        }),
      },
      metadata: {
        pagination: {
          pageNumber: Math.floor(offset / limit) + 1,
          pageSize: limit,
          totalRecords: tracks.length,
        },
      },
    });
  }),
  http.get('*/api/v1/syllabus/units/:unitSlug', ({ params }) => {
    const denied = guard();
    if (denied) return denied;

    const unit = syllabusUnitFixture();

    return params.unitSlug === unit.slug
      ? HttpResponse.json({ status: status(120004000), data: unit })
      : HttpResponse.json(
          { status: status(140404001, 'This unit is not available in the published syllabus.') },
          { status: 404 },
        );
  }),
  http.get('*/api/v1/syllabus/lessons/:lessonSlug', ({ params }) => {
    const denied = guard();
    if (denied) return denied;

    const lesson = syllabusLessonFixture();

    return params.lessonSlug === lesson.slug
      ? HttpResponse.json({ status: status(120004000), data: lesson })
      : HttpResponse.json(
          { status: status(140404002, 'This lesson is not available in the published syllabus.') },
          { status: 404 },
        );
  }),
];
