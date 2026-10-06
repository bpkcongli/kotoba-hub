// Jest loads its config before the TypeScript transformer is available.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const shared = {
  clearMocks: true,
  restoreMocks: true,
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};

module.exports = async () => {
  const projects = await Promise.all([
    createJestConfig({
      ...shared,
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/msw.ts'],
    })(),
    createJestConfig({
      ...shared,
      displayName: 'component',
      testEnvironment: '<rootDir>/tests/setup/jsdom-environment.cjs',
      testEnvironmentOptions: {
        customExportConditions: ['node', 'node-addons'],
        url: 'http://localhost:3000',
      },
      testMatch: ['<rootDir>/tests/component/**/*.test.ts?(x)'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/component.ts', '<rootDir>/tests/setup/msw.ts'],
    })(),
  ]);

  // ESM-only dependencies need the SWC transform in Jest on Node 20.
  for (const project of projects) {
    project.transformIgnorePatterns = [
      '/node_modules/(?!(until-async|rettime|@open-draft/deferred-promise|inversify|@inversifyjs)/)',
      '^.+\\.module\\.(css|sass|scss)$',
    ];
  }

  return { coverageProvider: 'v8', projects };
};
