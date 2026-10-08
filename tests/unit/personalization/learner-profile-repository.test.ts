import { getDatabase } from '@/backend/shared/infrastructure/database/connection';
import { DrizzleLearnerProfileRepository } from '@/backend/users/interface/secondary/persistence/drizzle-learner-profile.repository';

jest.mock('@/backend/shared/infrastructure/database/connection', () => ({
  getDatabase: jest.fn(),
}));

describe('confirmed profile transaction', () => {
  it('returns each concurrent request its own persisted values', async () => {
    let stored: Record<string, unknown> | null = null;
    let previous = Promise.resolve();

    const transaction = jest.fn(async (work: (transaction: unknown) => Promise<unknown>) => {
      const waitFor = previous;
      let release = () => {};
      previous = new Promise<void>((resolve) => {
        release = resolve;
      });
      await waitFor;

      const database = {
        insert: () => ({
          values: (values: Record<string, unknown>) => ({
            onDuplicateKeyUpdate: async () => {
              stored = {
                ...stored,
                ...values,
                id: stored?.id ?? values.id,
                onboardingCompletedAt:
                  stored?.onboardingCompletedAt ?? values.onboardingCompletedAt,
              };
            },
          }),
        }),
        select: () => ({
          from: () => ({
            where: () => ({ limit: async () => [stored] }),
          }),
        }),
      };
      try {
        return await work(database);
      } finally {
        release();
      }
    });
    jest.mocked(getDatabase).mockReturnValue({ transaction } as never);

    const repository = new DrizzleLearnerProfileRepository();
    const base = {
      userId: 'user-id',
      currentLevel: 'JLPT_N5',
      dailyGoalMinutes: 20,
      preferredScript: 'MIXED' as const,
      weakSkillFocuses: ['particles'],
      knownSkillClaims: [] as string[],
    };
    const [first, second] = await Promise.all([
      repository.confirm({ ...base, targetLevel: 'JLPT_N5' }),
      repository.confirm({ ...base, targetLevel: 'JLPT_N4' }),
    ]);

    expect(transaction).toHaveBeenCalledTimes(2);
    expect(first.targetLevel).toBe('JLPT_N5');
    expect(second.targetLevel).toBe('JLPT_N4');
    expect(second.id).toBe(first.id);
    expect(second.onboardingCompletedAt).toEqual(first.onboardingCompletedAt);
  });
});
