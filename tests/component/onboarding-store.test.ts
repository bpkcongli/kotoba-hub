import { http, HttpResponse } from 'msw';
import type {
  AssessmentRequest,
  ConfirmAssessmentRequest,
} from '@/frontend/onboarding/interfaces/requests';
import { createOnboardingContainer } from '@/frontend/onboarding/services/container';
import type { AssessmentFormData, IOnboardingStore } from '@/frontend/onboarding/services/internal';
import { ONBOARDING_TYPES } from '@/frontend/onboarding/services/types';
import { createFrontendContainer } from '@/frontend/shared/services/container';
import {
  assessmentDraftFixture,
  onboardingConfirmationFixture,
  onboardingProfileFixture,
  onboardingTracksFixture,
} from '@/mocks/fixtures/onboarding';
import { onboardingSessionFixture } from '@/mocks/fixtures/session';
import { server } from '@/mocks/msw.node';

const baseUrl = 'http://localhost:3000/api/v1';

function envelope(data: unknown, code = 120003000) {
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

function createStore() {
  const parentContainer = createFrontendContainer({
    bootstrap: { session: onboardingSessionFixture() },
  });
  const container = createOnboardingContainer({ parentContainer });

  return container.get<IOnboardingStore>(ONBOARDING_TYPES.OnboardingStore);
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

beforeEach(() => {
  server.use(
    http.get(`${baseUrl}/user-profile/me`, () =>
      HttpResponse.json(envelope(onboardingProfileFixture(), 120002000)),
    ),
    http.get(`${baseUrl}/syllabus`, () =>
      HttpResponse.json({
        ...envelope({ tracks: onboardingTracksFixture() }, 120004000),
        metadata: {
          pagination: {
            pageNumber: 1,
            pageSize: 100,
            totalRecords: onboardingTracksFixture().length,
          },
        },
      }),
    ),
    http.post(`${baseUrl}/personalization/assessment`, async ({ request }) =>
      HttpResponse.json(
        envelope(assessmentDraftFixture((await request.json()) as AssessmentRequest)),
      ),
    ),
    http.post(`${baseUrl}/personalization/assessment/confirm`, async ({ request }) =>
      HttpResponse.json(
        envelope(onboardingConfirmationFixture((await request.json()) as ConfirmAssessmentRequest)),
      ),
    ),
  );
});

test('uses only published targets and keeps each wizard container isolated', async () => {
  const first = createStore();
  const second = createStore();

  await first.load();
  await second.load();

  expect(first.tracks.map((track) => track.curriculumLevel)).toEqual(['N5']);
  first.setFormData({ targetLevel: 'JLPT_N4' });
  expect(first.validateFormData()).toBe(false);
  expect(first.formErrors.targetLevel).toBeTruthy();
  expect(second.formData.targetLevel).not.toBe('JLPT_N4');
});

test('blocks an unpublished current level and accepts a published current level', async () => {
  const assessRequested = jest.fn();

  server.use(
    http.post(`${baseUrl}/personalization/assessment`, async ({ request }) => {
      const input = (await request.json()) as AssessmentRequest;

      assessRequested(input);

      return HttpResponse.json(envelope(assessmentDraftFixture(input)));
    }),
  );

  const store = createStore();

  await store.load();
  store.setFormData({ currentLevel: 'JLPT_N4' });

  await store.submit();

  expect(store.formErrors.currentLevel).toBeTruthy();
  expect(store.result).toBeNull();
  expect(assessRequested).not.toHaveBeenCalled();

  store.setFormData({ currentLevel: 'JLPT_N5' });
  await store.submit();

  expect(store.formErrors.currentLevel).toBeUndefined();
  expect(assessRequested).toHaveBeenCalledWith(
    expect.objectContaining({ currentLevel: 'JLPT_N5' }),
  );
  expect(store.result?.draftProfile.currentLevel).toBe('JLPT_N5');
});

test.each<{ patch: Partial<AssessmentFormData>; field: keyof AssessmentFormData }>([
  { patch: { dailyGoalMinutes: '' }, field: 'dailyGoalMinutes' },
  { patch: { dailyGoalMinutes: '   ' }, field: 'dailyGoalMinutes' },
  { patch: { dailyGoalMinutes: '0' }, field: 'dailyGoalMinutes' },
  { patch: { dailyGoalMinutes: '1.5' }, field: 'dailyGoalMinutes' },
  { patch: { dailyGoalMinutes: '2147483648' }, field: 'dailyGoalMinutes' },
  { patch: { dailyGoalMinutes: 'Infinity' }, field: 'dailyGoalMinutes' },
  { patch: { dailyGoalMinutes: 'invalid' }, field: 'dailyGoalMinutes' },
  { patch: { note: 'a'.repeat(2001) }, field: 'note' },
  { patch: { weakSkillFocuses: ['   '] }, field: 'weakSkillFocuses' },
  { patch: { weakSkillFocuses: ['a'.repeat(101)] }, field: 'weakSkillFocuses' },
  { patch: { targetLevel: '' }, field: 'targetLevel' },
  { patch: { currentLevel: '' }, field: 'currentLevel' },
])(
  'rejects invalid $field input before submitting and keeps the input',
  async ({ patch, field }) => {
    const requested = jest.fn();

    server.use(
      http.post(`${baseUrl}/personalization/assessment`, () => {
        requested();

        return HttpResponse.error();
      }),
    );

    const store = createStore();

    await store.load();
    store.setFormData(patch);
    await store.submit();

    expect(store.formErrors[field]).toBeTruthy();
    expect(Object.keys(store.formErrors)).toEqual([field]);
    expect(store.formData).toEqual(expect.objectContaining(patch));
    expect(store.step).toBe('assessment');
    expect(requested).not.toHaveBeenCalled();
  },
);

test.each(['1', '2147483647'])(
  'accepts daily goal boundary %s and converts only the request value to a number',
  async (minutes) => {
    const store = createStore();

    await store.load();
    store.setFormData({
      dailyGoalMinutes: minutes,
      weakSkillFocuses: ['a'.repeat(100)],
      note: 'a'.repeat(2000),
    });
    await store.submit();

    expect(store.formErrors).toEqual({});
    expect(store.result?.draftProfile.dailyGoalMinutes).toBe(Number(minutes));
    expect(store.formData.dailyGoalMinutes).toBe(minutes);
    expect(store.formData.note).toHaveLength(2000);
  },
);

test('collects errors for every invalid field and clears them after correction', async () => {
  const store = createStore();

  await store.load();
  store.setFormData({
    dailyGoalMinutes: '0',
    weakSkillFocuses: ['', '   '],
    note: 'a'.repeat(2001),
  });

  expect(store.validateFormData()).toBe(false);
  expect(store.formErrors).toEqual({
    dailyGoalMinutes: 'Enter a whole number of minutes greater than zero.',
    weakSkillFocuses: 'Each focus must contain between 1 and 100 characters.',
    note: 'Keep your note within 2,000 characters.',
  });

  store.setFormData({ dailyGoalMinutes: '20', weakSkillFocuses: [], note: '' });

  expect(store.validateFormData()).toBe(true);
  expect(store.formErrors).toEqual({});
});

test('uses the latest published catalog after a reload for form validation', async () => {
  const store = createStore();

  await store.load();
  store.setFormData({ currentLevel: 'JLPT_N4', targetLevel: 'JLPT_N4' });

  expect(store.validateFormData()).toBe(false);

  const tracks = [{ ...onboardingTracksFixture()[0], curriculumLevel: 'N4' }];

  server.use(
    http.get(`${baseUrl}/syllabus`, () =>
      HttpResponse.json({
        ...envelope({ tracks }, 120004000),
        metadata: { pagination: { pageNumber: 1, pageSize: 100, totalRecords: tracks.length } },
      }),
    ),
  );

  await store.load();

  expect(store.validateFormData()).toBe(true);
  expect(store.formErrors).toEqual({});
});

test('builds a review draft without saving and excludes a deselected suggestion from confirmation', async () => {
  let assessmentInput: AssessmentRequest | undefined;
  let confirmedInput: ConfirmAssessmentRequest | undefined;
  const confirmRequested = jest.fn();

  server.use(
    http.post(`${baseUrl}/personalization/assessment`, async ({ request }) => {
      assessmentInput = (await request.json()) as AssessmentRequest;

      return HttpResponse.json(envelope(assessmentDraftFixture(assessmentInput)));
    }),
    http.post(`${baseUrl}/personalization/assessment/confirm`, async ({ request }) => {
      confirmRequested();
      confirmedInput = (await request.json()) as ConfirmAssessmentRequest;

      return HttpResponse.json(envelope(onboardingConfirmationFixture(confirmedInput)));
    }),
  );

  const store = createStore();

  await store.load();
  store.setFormData({ note: 'I can read hiragana.' });
  await store.submit();

  expect(assessmentInput?.note).toBe('I can read hiragana.');
  expect(store.step).toBe('review');
  expect(store.confirmation).toBeNull();
  expect(confirmRequested).not.toHaveBeenCalled();

  const suggestion = store.result?.suggestedKnownSkillClaims[0];

  expect(suggestion).toBeDefined();
  store.setKnownSkillClaim(suggestion!.skillCode, false);

  await expect(store.confirm()).resolves.toBe(true);

  expect(confirmedInput?.knownSkillClaims).toEqual([]);
  expect(confirmedInput).not.toHaveProperty('note');
  expect(confirmRequested).toHaveBeenCalledTimes(1);
  expect(store.confirmation?.userProfile.appAccess).toBe('APP_READY');
});

test('editing invalidates the reviewed draft and requires a new assessment before saving', async () => {
  const confirmRequested = jest.fn();

  server.use(
    http.post(`${baseUrl}/personalization/assessment/confirm`, () => {
      confirmRequested();

      return HttpResponse.error();
    }),
  );

  const store = createStore();

  await store.load();
  store.setFormData({ note: 'Keep this note.' });
  await store.submit();
  store.editAssessment();
  store.setFormData({ dailyGoalMinutes: '30' });

  expect(store.formData.note).toBe('Keep this note.');
  expect(store.result).toBeNull();
  expect(store.step).toBe('assessment');
  await expect(store.confirm()).resolves.toBe(false);
  expect(confirmRequested).not.toHaveBeenCalled();

  await store.submit();
  expect(store.result?.draftProfile.dailyGoalMinutes).toBe(30);
});

test('retains assessment input after failure and allows a structured-only retry', async () => {
  const store = createStore();

  await store.load();
  store.setFormData({ note: 'AI must not silently drop this note.', dailyGoalMinutes: '25' });
  server.use(
    http.post(`${baseUrl}/personalization/assessment`, () =>
      HttpResponse.json(
        {
          status: {
            traceId: '550e8400-e29b-41d4-a716-446655440001',
            code: 150003999,
            message: 'Could not prepare your draft. Try again without the note.',
            errorDetails: [],
          },
        },
        { status: 500 },
      ),
    ),
  );

  await store.submit();

  expect(store.formData.note).toBe('AI must not silently drop this note.');
  expect(store.formData.dailyGoalMinutes).toBe('25');
  expect(store.error?.traceId).toBe('550e8400-e29b-41d4-a716-446655440001');
  expect(store.result).toBeNull();
  expect(store.isSubmitting).toBe(false);

  server.use(
    http.post(`${baseUrl}/personalization/assessment`, async ({ request }) =>
      HttpResponse.json(
        envelope(assessmentDraftFixture((await request.json()) as AssessmentRequest)),
      ),
    ),
  );
  store.setFormData({ note: '' });
  await store.submit();

  expect(store.result?.aiNormalizationUsed).toBe(false);
  expect(store.error).toBeNull();
});

test('keeps the reviewed draft and selections after a failed confirmation for retry', async () => {
  const store = createStore();

  await store.load();
  store.setFormData({ note: 'I can read hiragana.' });
  await store.submit();

  const draft = store.result;

  server.use(
    http.post(`${baseUrl}/personalization/assessment/confirm`, () =>
      HttpResponse.json(
        {
          status: {
            traceId: '550e8400-e29b-41d4-a716-446655440002',
            code: 150003999,
            message: 'Could not save your profile. Please try again.',
            errorDetails: [],
          },
        },
        { status: 500 },
      ),
    ),
  );

  await expect(store.confirm()).resolves.toBe(false);

  expect(store.result).toEqual(draft);
  expect(store.step).toBe('review');
  expect(store.confirmation).toBeNull();
  expect(store.error?.code).toBe(150003999);

  server.use(
    http.post(`${baseUrl}/personalization/assessment/confirm`, async ({ request }) =>
      HttpResponse.json(
        envelope(onboardingConfirmationFixture((await request.json()) as ConfirmAssessmentRequest)),
      ),
    ),
  );
  await expect(store.confirm()).resolves.toBe(true);
  expect(store.confirmation?.userProfile.learnerProfile?.knownSkillClaims).toEqual([
    draft!.suggestedKnownSkillClaims[0].skillCode,
  ]);
});

test('rejects a malformed assessment response without exposing it as a review draft', async () => {
  const store = createStore();

  await store.load();
  server.use(
    http.post(`${baseUrl}/personalization/assessment`, () =>
      HttpResponse.json(envelope({ draftProfile: { targetLevel: 'JLPT_N5' } })),
    ),
  );

  await store.submit();

  expect(store.result).toBeNull();
  expect(store.error?.code).toBe('contract');
  expect(store.step).toBe('assessment');
});

test('does not submit an assessment when the published catalog is empty', async () => {
  const requested = jest.fn();

  server.use(
    http.get(`${baseUrl}/syllabus`, () =>
      HttpResponse.json({
        ...envelope({ tracks: [] }, 120004000),
        metadata: { pagination: { pageNumber: 1, pageSize: 100, totalRecords: 0 } },
      }),
    ),
    http.post(`${baseUrl}/personalization/assessment`, () => {
      requested();

      return HttpResponse.error();
    }),
  );

  const store = createStore();

  await store.load();
  await store.submit();

  expect(store.tracks).toEqual([]);
  expect(store.result).toBeNull();
  expect(requested).not.toHaveBeenCalled();
});

test('suppresses a disposed assessment result and supports a fresh lifecycle request', async () => {
  const started = deferred();
  const released = deferred();

  server.use(
    http.post(`${baseUrl}/personalization/assessment`, async ({ request }) => {
      const input = (await request.json()) as AssessmentRequest;

      started.resolve();
      await released.promise;

      return HttpResponse.json(envelope(assessmentDraftFixture(input)));
    }),
  );

  const store = createStore();

  await store.load();

  const pending = store.submit();

  await started.promise;
  store.dispose();
  store.dispose();
  released.resolve();
  await pending;

  expect(store.result).toBeNull();
  expect(store.error).toBeNull();
  expect(store.isSubmitting).toBe(false);

  server.use(
    http.post(`${baseUrl}/personalization/assessment`, async ({ request }) =>
      HttpResponse.json(
        envelope(assessmentDraftFixture((await request.json()) as AssessmentRequest)),
      ),
    ),
  );
  await store.load();
  await store.submit();
  expect(store.step).toBe('review');
});

test('maps recognized validation fields and retains cross-field error details for the summary', async () => {
  const store = createStore();

  await store.load();
  server.use(
    http.post(`${baseUrl}/personalization/assessment`, () =>
      HttpResponse.json(
        {
          status: {
            traceId: '550e8400-e29b-41d4-a716-446655440003',
            code: 142203002,
            message: 'The catalog changed. Check the selected target.',
            errorDetails: [
              { field: 'targetLevel', message: 'This target is no longer available.' },
              { field: 'catalog', message: 'Refresh the published catalog.' },
            ],
          },
        },
        { status: 422 },
      ),
    ),
  );

  await store.submit();

  expect(store.formErrors.targetLevel).toBe('This target is no longer available.');
  expect(store.formErrors).not.toHaveProperty('catalog');
  expect(store.error?.fieldErrors).toContainEqual({
    field: 'catalog',
    message: 'Refresh the published catalog.',
  });
  expect(store.formData.targetLevel).toBe('JLPT_N5');
});
