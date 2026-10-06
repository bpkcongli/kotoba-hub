import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';

const sourceFiles = ['src/**/*.{js,jsx,ts,tsx}', 'tests/**/*.{js,jsx,ts,tsx}'];
const toolFiles = ['*.config.{js,cjs,mjs,ts}'];

const importOrder = [
  'error',
  {
    groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
    pathGroups: [{ pattern: '@/**', group: 'internal', position: 'after' }],
    pathGroupsExcludedImportTypes: ['builtin'],
    'newlines-between': 'never',
    alphabetize: { order: 'asc', caseInsensitive: true },
  },
];

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    files: [...sourceFiles, ...toolFiles],
    plugins: { import: importPlugin, prettier: prettierPlugin, react: reactPlugin },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    rules: {
      // The reference uses ESLint 8 and legacy Airbnb config. Keep its import
      // conventions on the ESLint 9 / Next.js 16 flat-config baseline.
      'import/order': importOrder,
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: false,
          optionalDependencies: false,
          peerDependencies: false,
        },
      ],
      'import/prefer-default-export': 'off',
      'import/extensions': [
        'error',
        'ignorePackages',
        { js: 'never', jsx: 'never', ts: 'never', tsx: 'never' },
      ],
      'no-underscore-dangle': 'off',
      'no-shadow': 'off',
    },
  },
  {
    files: [
      'src/app/**/*.{js,jsx,ts,tsx}',
      'src/frontend/**/*.{js,jsx,ts,tsx}',
      'tests/component/**/*.{js,jsx,ts,tsx}',
    ],
    rules: {
      'react/jsx-filename-extension': ['warn', { extensions: ['.jsx', '.tsx'] }],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/require-default-props': 'off',
      'react/jsx-props-no-spreading': 'off',
      'react/function-component-definition': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // TypeScript handles name resolution and unused bindings for typed files.
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['src/frontend/**/*.{js,jsx,ts,tsx}', 'src/mocks/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/backend/**', '**/backend/**'],
              message: 'Frontend and mock code use API DTOs, never backend modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/backend/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/frontend/**', '**/frontend/**', '@/mocks/**', '**/mocks/**'],
              message: 'Backend code must not depend on frontend or mock modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*'],
              message: 'Use the @/ path alias for imports from parent folders in app routes.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/mocks/**/*.{js,jsx,ts,tsx}', 'tests/**/*.{js,jsx,ts,tsx}', ...toolFiles],
    rules: {
      // These files legitimately import Jest, MSW, Drizzle Kit and other dev tools.
      'import/no-extraneous-dependencies': [
        'error',
        { devDependencies: true, optionalDependencies: false, peerDependencies: false },
      ],
    },
  },
  prettier,
  {
    files: [...sourceFiles, ...toolFiles],
    rules: { 'prettier/prettier': 'error' },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'coverage/**',
    'next-env.d.ts',
    'public/mockServiceWorker.js',
    'content/**',
    'docs/**',
    '.agents/**',
    '.codex/**',
    '.qodo/**',
  ]),
]);
