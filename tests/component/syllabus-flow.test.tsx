import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { LessonPostStudy } from '@/frontend/practice/features';
import { FrontendContainerProvider } from '@/frontend/shared/providers';
import { LessonOverview, SyllabusMap, UnitDetail } from '@/frontend/syllabus/features';
import { anonymousSessionFixture, appReadySessionFixture } from '@/mocks/fixtures/session';
import {
  lessonQuizFixture,
  syllabusLessonFixture,
  syllabusTracksFixture,
  syllabusUnitFixture,
} from '@/mocks/fixtures/syllabus';
import { server } from '@/mocks/msw.node';

const baseUrl = 'http://localhost:3000/api/v1';

function envelope(data: unknown, code = 120004000) {
  return {
    status: {
      traceId: '550e8400-e29b-41d4-a716-446655440000',
      code,
      message: 'Success!',
      errorDetails: [],
    },
    data,
  };
}

function failure(code: number, message: string, httpStatus: number) {
  return HttpResponse.json(
    {
      status: {
        traceId: '550e8400-e29b-41d4-a716-446655440007',
        code,
        message,
        errorDetails: [],
      },
    },
    { status: httpStatus },
  );
}

function renderFeature(feature: ReactNode) {
  return render(
    <FrontendContainerProvider bootstrap={{ session: appReadySessionFixture() }}>
      {feature}
    </FrontendContainerProvider>,
  );
}

beforeEach(() => {
  server.use(
    http.get(`${baseUrl}/syllabus`, () =>
      HttpResponse.json({
        ...envelope({ tracks: syllabusTracksFixture() }),
        metadata: { pagination: { pageNumber: 1, pageSize: 100, totalRecords: 1 } },
      }),
    ),
    http.get(`${baseUrl}/syllabus/units/:slug`, () =>
      HttpResponse.json(envelope(syllabusUnitFixture())),
    ),
    http.get(`${baseUrl}/syllabus/lessons/:slug`, () =>
      HttpResponse.json(envelope(syllabusLessonFixture())),
    ),
    http.post(`${baseUrl}/practice/lesson-post-study/next`, () =>
      HttpResponse.json(envelope(lessonQuizFixture(), 120006000)),
    ),
  );
});

test('offers every published unit in track order, including units outside the foundation', async () => {
  const track = syllabusTracksFixture()[0];
  const extraUnit = {
    ...track.units[0],
    id: '550e8400-e29b-41d4-a716-446655440008',
    slug: 'n5-particle-basics',
    title: 'Particle Basics',
    sortOrder: 2,
    isFoundationUnit: false,
  };

  server.use(
    http.get(`${baseUrl}/syllabus`, ({ request }) => {
      expect(new URL(request.url).searchParams.get('includeUnits')).toBe('true');

      return HttpResponse.json({
        ...envelope({ tracks: [{ ...track, unitCount: 2, units: [extraUnit, ...track.units] }] }),
        metadata: { pagination: { pageNumber: 1, pageSize: 100, totalRecords: 1 } },
      });
    }),
  );
  renderFeature(<SyllabusMap />);

  const links = await screen.findAllByRole('link', { name: /^View / });

  expect(links.map((link) => link.getAttribute('href'))).toEqual([
    `/syllabus/units/${track.units[0].slug}`,
    '/syllabus/units/n5-particle-basics',
  ]);
  expect(screen.getByText(/Reading alone does not complete it\./)).toBeInTheDocument();
});

test('shows ordered lesson links and learning objectives from unit detail', async () => {
  const unit = syllabusUnitFixture();
  const laterLesson = {
    ...unit.lessons[0],
    id: '550e8400-e29b-41d4-a716-446655440009',
    slug: 'hiragana-row-ka',
    title: 'Hiragana Row Ka',
    learningObjective: 'Read the next five hiragana sounds.',
    sortOrder: 2,
  };

  server.use(
    http.get(`${baseUrl}/syllabus/units/:slug`, () =>
      HttpResponse.json(envelope({ ...unit, lessons: [laterLesson, ...unit.lessons] })),
    ),
  );
  renderFeature(<UnitDetail unitSlug={unit.slug} />);

  const links = await screen.findAllByRole('link', { name: /^Read / });

  expect(links.map((link) => link.getAttribute('href'))).toEqual([
    `/syllabus/lessons/${unit.lessons[0].slug}`,
    '/syllabus/lessons/hiragana-row-ka',
  ]);
  expect(screen.getByText(laterLesson.learningObjective)).toBeInTheDocument();
  expect(screen.queryByText('Completed')).not.toBeInTheDocument();
});

test('renders safe ordered lesson material and requires the quiz after reading', async () => {
  const user = userEvent.setup();
  const lesson = syllabusLessonFixture();

  lesson.contentBlocks = [
    {
      id: '550e8400-e29b-41d4-a716-446655440011',
      blockType: 'GRAMMAR_STRUCTURE',
      sortOrder: 3,
      content: {
        skillCode: lesson.skills[0].code,
        ALL: '<p>Use this pattern for a simple statement.</p>',
        STANDARD: '<p>Plain form explanation.</p>',
        POLITE: '<p>Polite form explanation.</p>',
      },
    },
    ...lesson.contentBlocks,
  ];
  const paragraph = lesson.contentBlocks.find((block) => block.blockType === 'PARAGRAPH')!;

  paragraph.content.body =
    '<p>Read <span class="text-emphasis" onclick="alert(1)">あ</span> aloud.</p>' +
    '<script>window.lessonInjected=true</script><img src="x" onerror="alert(1)">' +
    '<a href="javascript:alert(1)">Unsafe link label</a>';
  server.use(
    http.get(`${baseUrl}/syllabus/lessons/:slug`, () => HttpResponse.json(envelope(lesson))),
  );
  const { container } = renderFeature(<LessonOverview lessonSlug={lesson.slug} />);

  await screen.findByText('Understanding 0/10');
  expect(screen.getByText('あさです。').closest('[lang]')).toHaveAttribute('lang', 'ja');
  expect(screen.getByText('It is morning.')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Standard form' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Polite form' })).toBeInTheDocument();
  expect(screen.getByText('Polite form explanation.')).toBeInTheDocument();
  expect(
    container.querySelector('script, img, [onclick], [onerror], a[href^="javascript:"]'),
  ).toBeNull();
  expect(screen.queryByText('window.lessonInjected=true')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Start post-study quiz' })).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Finish reading' }));

  expect(screen.getByText('Quiz required')).toBeInTheDocument();
  expect(screen.getByText('Understanding 0/10')).toBeInTheDocument();
  expect(screen.queryByText('Completed')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Start post-study quiz' })).toHaveAttribute(
    'href',
    `/syllabus/lessons/${lesson.slug}/post-study`,
  );
});

test('shows an empty catalog, a reload failure, then recovers through retry', async () => {
  const user = userEvent.setup();

  server.use(
    http.get(`${baseUrl}/syllabus`, () =>
      HttpResponse.json({
        ...envelope({ tracks: [] }),
        metadata: { pagination: { pageNumber: 1, pageSize: 100, totalRecords: 0 } },
      }),
    ),
  );
  renderFeature(<SyllabusMap />);

  await screen.findByRole('heading', { name: 'No lessons are available yet' });
  server.use(
    http.get(`${baseUrl}/syllabus`, () => failure(150004999, 'Catalog read failed.', 500)),
  );
  await user.click(screen.getByRole('button', { name: 'Reload syllabus' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Catalog read failed.');

  server.use(
    http.get(`${baseUrl}/syllabus`, () =>
      HttpResponse.json({
        ...envelope({ tracks: syllabusTracksFixture() }),
        metadata: { pagination: { pageNumber: 1, pageSize: 100, totalRecords: 1 } },
      }),
    ),
  );
  await user.click(screen.getByRole('button', { name: 'Try again' }));

  expect(await screen.findByRole('link', { name: /^View / })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('does not offer a quiz for a missing lesson or unavailable reading material', async () => {
  const user = userEvent.setup();
  const lesson = syllabusLessonFixture();

  server.use(
    http.get(`${baseUrl}/syllabus/lessons/:slug`, () =>
      failure(140404002, 'This lesson is not published.', 404),
    ),
  );
  renderFeature(<LessonOverview lessonSlug={lesson.slug} />);

  await screen.findByRole('heading', { name: 'Lesson unavailable' });
  expect(screen.queryByRole('button', { name: 'Finish reading' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Start post-study quiz' })).not.toBeInTheDocument();

  server.use(
    http.get(`${baseUrl}/syllabus/lessons/:slug`, () =>
      HttpResponse.json(envelope({ ...lesson, contentBlocks: [] })),
    ),
  );
  await user.click(screen.getByRole('button', { name: 'Try again' }));

  await screen.findByRole('heading', { name: 'Study material is unavailable' });
  expect(screen.queryByRole('button', { name: 'Finish reading' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Start post-study quiz' })).not.toBeInTheDocument();
});

test('loads one authoritative maximum-level review question without generating a practice session', async () => {
  const quiz = lessonQuizFixture();
  const nextRequested = jest.fn();
  const generateRequested = jest.fn();

  server.use(
    http.post(`${baseUrl}/practice/lesson-post-study/next`, async ({ request }) => {
      nextRequested(await request.json());

      return HttpResponse.json(
        envelope(
          {
            ...quiz,
            currentUnderstandingLevel: 10,
            targetUnderstandingLevel: 10,
            targetDifficultyLevel: 10,
            isReview: true,
            question: { ...quiz.question, difficultyLevel: 10 },
          },
          120006000,
        ),
      );
    }),
    http.post(`${baseUrl}/practice/sessions/generate`, () => {
      generateRequested();

      return HttpResponse.error();
    }),
  );
  renderFeature(<LessonPostStudy lessonSlug={quiz.lessonSlug} />);

  expect(await screen.findByText('Difficulty 10/10')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Lesson review' })).toBeInTheDocument();
  expect(screen.getByText('Understanding 10/10')).toBeInTheDocument();
  expect(screen.getByText(quiz.question.promptPayload.sentenceTemplate)).toHaveAttribute(
    'lang',
    'ja',
  );
  expect(screen.getAllByRole('region', { name: 'Lesson question' })).toHaveLength(1);
  expect(screen.getByRole('textbox', { name: 'Romaji or Japanese answer' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Check answer' })).toBeDisabled();
  expect(nextRequested).toHaveBeenCalledTimes(1);
  expect(nextRequested).toHaveBeenCalledWith({ lessonSlug: quiz.lessonSlug });
  expect(generateRequested).not.toHaveBeenCalled();
});

test('offers sign-in and revalidates the session after an expired unit request', async () => {
  const sessionRequested = jest.fn(() =>
    HttpResponse.json(envelope(anonymousSessionFixture(), 120001000)),
  );

  server.use(
    http.get(`${baseUrl}/syllabus/units/:slug`, () => failure(140104001, 'Unauthorized.', 401)),
    http.get(`${baseUrl}/auth/session`, sessionRequested),
  );
  renderFeature(<UnitDetail unitSlug={syllabusUnitFixture().slug} />);

  expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  await waitFor(() => expect(sessionRequested).toHaveBeenCalled());
  expect(screen.queryByRole('link', { name: /^Read / })).not.toBeInTheDocument();
});
