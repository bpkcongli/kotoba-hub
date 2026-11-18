import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { observer } from 'mobx-react-lite';
import { HttpResponse, http } from 'msw';
import type { LessonAnswerRequest } from '@/frontend/practice/interfaces/requests';
import { createPracticeContainer, PRACTICE_TYPES } from '@/frontend/practice/services';
import type { IPracticeStore } from '@/frontend/practice/services/internal';
import { useAppSessionStore, useLocaleStore } from '@/frontend/shared/hooks';
import { FrontendContainerProvider } from '@/frontend/shared/providers';
import { createFrontendContainer, SHARED_TYPES } from '@/frontend/shared/services';
import type { ILocaleStore } from '@/frontend/shared/services/internal';
import { LessonContent } from '@/frontend/syllabus/components/organisms';
import { SyllabusMap } from '@/frontend/syllabus/features';
import { appReadySessionFixture } from '@/mocks/fixtures/session';
import { lessonQuizFixture, syllabusTracksFixture } from '@/mocks/fixtures/syllabus';
import { server } from '@/mocks/msw.node';
import { localizedFixture } from '@/mocks/states/locale';
import { setMockSession } from '@/mocks/states/session';

const root = 'http://localhost:3000/api/v1';
const bootstrap = {
  session: appReadySessionFixture(),
  preferences: { contentLocale: 'id' as const, uiLocale: 'en' as const },
  localizedSyllabus: true,
};

function envelope(data: unknown, code = 120004000) {
  return {
    status: { traceId: crypto.randomUUID(), code, message: 'Success!', errorDetails: [] },
    data,
  };
}

beforeEach(() => setMockSession(appReadySessionFixture()));

test('refreshed SSR bootstrap changes session and locale together', async () => {
  const Probe = observer(function Probe() {
    const session = useAppSessionStore();
    const locale = useLocaleStore();

    return (
      <p>
        {session.snapshot?.user?.id}:{locale.preferences.contentLocale}:
        {String(locale.localizedSyllabus)}
      </p>
    );
  });

  const { rerender } = render(
    <FrontendContainerProvider bootstrap={bootstrap}>
      <Probe />
    </FrontendContainerProvider>,
  );

  const next = {
    ...bootstrap,
    session: appReadySessionFixture(),
    preferences: { contentLocale: 'en' as const, uiLocale: 'en' as const },
  };
  next.session = {
    ...next.session,
    sessionId: crypto.randomUUID(),
    user: { ...next.session.user!, id: crypto.randomUUID() },
  };

  rerender(
    <FrontendContainerProvider bootstrap={next}>
      <Probe />
    </FrontendContainerProvider>,
  );

  await screen.findByText(`${next.session.user!.id}:en:true`);
});

test('SSR bootstrap and client start in the same language, then persist a change and reload the map', async () => {
  const seen: string[] = [];

  server.use(
    http.get(`${root}/syllabus`, ({ request }) => {
      const query = new URL(request.url).searchParams;
      expect(query.get('contentFormat')).toBe('localized');

      const locale = query.get('contentLocale') as 'en' | 'id';
      seen.push(locale);

      return HttpResponse.json({
        ...envelope({ tracks: localizedFixture(syllabusTracksFixture(), locale) }),
        metadata: { pagination: { pageNumber: 1, pageSize: 100, totalRecords: 1 } },
      });
    }),
  );

  render(
    <FrontendContainerProvider bootstrap={bootstrap}>
      <SyllabusMap />
    </FrontendContainerProvider>,
  );

  const selector = await screen.findByRole('combobox', { name: 'Content language' });

  expect(selector).toHaveValue('id');

  await waitFor(() => expect(seen).toEqual(['id']));

  await userEvent.selectOptions(selector, 'en');

  await waitFor(() => expect(seen).toEqual(['id', 'en']));

  expect(screen.getByRole('combobox', { name: 'Content language' })).toHaveValue('en');
});

test('a late map response from the old locale cannot replace the new scope', async () => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });

  server.use(
    http.get(`${root}/syllabus`, async ({ request }) => {
      const locale = new URL(request.url).searchParams.get('contentLocale') as 'en' | 'id';
      if (locale === 'id') await pending;

      const tracks = localizedFixture(syllabusTracksFixture(), locale);
      tracks[0].title = locale === 'id' ? 'Old Indonesian response' : 'Current English response';

      return HttpResponse.json({
        ...envelope({ tracks }),
        metadata: { pagination: { pageNumber: 1, pageSize: 100, totalRecords: 1 } },
      });
    }),
  );

  render(
    <FrontendContainerProvider bootstrap={bootstrap}>
      <SyllabusMap />
    </FrontendContainerProvider>,
  );

  // The picker stays available while a catalog request is in flight.
  const selector = await screen.findByRole('combobox', { name: 'Content language' });

  await userEvent.selectOptions(selector, 'en');
  await screen.findByRole('heading', { name: 'Current English response' });

  await act(async () => {
    release();
    await pending;
  });

  expect(screen.queryByText('Old Indonesian response')).not.toBeInTheDocument();
});

test('localized quiz keeps its delivery and identical answer/key when locale changes after a lost response', async () => {
  const parentContainer = createFrontendContainer({ bootstrap });
  const locale = parentContainer.get<ILocaleStore>(SHARED_TYPES.LocaleStore);
  const store = createPracticeContainer({ parentContainer }).get<IPracticeStore>(
    PRACTICE_TYPES.Store,
  );

  const requests: { body: LessonAnswerRequest; key: string | null }[] = [];
  let attempts = 0;

  server.use(
    http.post(`${root}/practice/lesson-post-study/answer`, async ({ request }) => {
      const body = (await request.json()) as LessonAnswerRequest;
      requests.push({ body, key: request.headers.get('Idempotency-Key') });
      if (++attempts === 1) return HttpResponse.error();

      return HttpResponse.json(
        envelope(
          {
            lessonSlug: body.lessonSlug,
            questionId: body.questionId,
            deliveryId: body.deliveryId,
            localization: store.lessonQuiz!.question.localization,
            isCorrect: true,
            numericScore: 100,
            feedbackText: '<p>Saved feedback.</p>',
            gradingSource: 'RULE_ENGINE',
            understandingProgress: {
              currentUnderstandingLevelBefore: 0,
              currentUnderstandingLevelAfter: 1,
              targetDifficultyLevel: 1,
              maxUnderstandingLevel: 10,
              postStudyQuizCompleted: true,
              nextReviewDifficultyLevel: 2,
            },
            progressImpact: null,
          },
          120006000,
        ),
      );
    }),
  );

  await store.loadLessonQuiz(lessonQuizFixture().lessonSlug);

  expect(store.lessonQuiz?.deliveryId).toBeDefined();
  const deliveryId = store.lessonQuiz!.deliveryId;
  expect(store.lessonQuiz!.question.localization).toMatchObject({
    requestedLocale: 'id',
    resolvedLocale: 'en',
    isFallback: true,
  });

  store.setTextInput('a');
  await store.submitAnswer();

  await locale.setContentLocale('en');
  await store.submitAnswer();

  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
  expect(requests[0].body).toMatchObject({ contentFormat: 'localized', deliveryId });
  expect(requests[0].body).not.toHaveProperty('contentLocale');
  expect(store.lessonResult?.deliveryId).toBe(deliveryId);

  store.dispose();
  locale.dispose();
});

test('renders neutral translations, safe HTML and separate Japanese language annotations', () => {
  render(
    <FrontendContainerProvider bootstrap={bootstrap}>
      <LessonContent
        blocks={[
          {
            id: crypto.randomUUID(),
            blockType: 'EXAMPLE_SENTENCE',
            sortOrder: 1,
            localization: {
              requestedLocale: 'id',
              resolvedLocale: 'id',
              isFallback: false,
              contentRevision: 1,
              translationRevision: 1,
            },
            content: {
              japaneseSentence: '<p>こんにちは。</p>',
              translation: '<p>Selamat siang.<script>alert(1)</script></p>',
            },
          },
        ]}
      />
    </FrontendContainerProvider>,
  );

  expect(screen.getByText('こんにちは。').closest('[lang]')).toHaveAttribute('lang', 'ja');
  expect(screen.getByText('Selamat siang.').closest('[lang]')).toHaveAttribute('lang', 'id');
  expect(document.querySelector('script')).toBeNull();
});
