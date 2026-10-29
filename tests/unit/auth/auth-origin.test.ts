import { readAuthOrigin } from '@/backend/auth/infrastructure/config/auth-origin';

test.each(['development', 'test'])('defaults to localhost in %s', (nodeEnv) => {
  expect(readAuthOrigin({ NODE_ENV: nodeEnv })).toBe('http://localhost:3000');
});

test.each([
  ['http://localhost:3012', 'development', 'http://localhost:3012'],
  ['http://127.0.0.1:8080/', 'development', 'http://127.0.0.1:8080'],
  ['https://learn.example.com', 'production', 'https://learn.example.com'],
  ['https://learn.example.com/', 'production', 'https://learn.example.com'],
])('reads the configured origin %s', (authUrl, nodeEnv, expected) => {
  expect(readAuthOrigin({ AUTH_URL: authUrl, NODE_ENV: nodeEnv })).toBe(expected);
});

test.each([undefined, ''])('requires AUTH_URL in production when value is %s', (authUrl) => {
  expect(() => readAuthOrigin({ AUTH_URL: authUrl, NODE_ENV: 'production' })).toThrow(
    'AUTH_URL is required in production.',
  );
});

test.each([
  '/relative-origin',
  'not-a-url',
  'javascript:alert(1)',
  'ftp://learn.example.com',
  'https://user:private-password@learn.example.com',
  'https://learn.example.com/api/v1/auth',
  'https://learn.example.com?returnTo=/dashboard',
  'https://learn.example.com#fragment',
  'https://learn.example.com?',
  'https://learn.example.com#',
])('rejects invalid origin %s with a safe configuration error', (authUrl) => {
  expect(() => readAuthOrigin({ AUTH_URL: authUrl, NODE_ENV: 'production' })).toThrow('AUTH_URL');
  expect(() => readAuthOrigin({ AUTH_URL: authUrl, NODE_ENV: 'production' })).not.toThrow(
    'private-password',
  );
});
