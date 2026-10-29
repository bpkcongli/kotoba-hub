export function readAuthOrigin(
  environment: { AUTH_URL?: string; NODE_ENV?: string } = {
    AUTH_URL: process.env.AUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
): string {
  const value = environment.AUTH_URL;

  if (!value) {
    if (environment.NODE_ENV === 'production') {
      throw new Error('AUTH_URL is required in production.');
    }

    return 'http://localhost:3000';
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error('AUTH_URL must be a valid http:// or https:// origin.');
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.href !== `${url.origin}/`) {
    throw new Error(
      'AUTH_URL must be an http:// or https:// origin without credentials, path, query, or fragment.',
    );
  }

  return url.origin;
}
