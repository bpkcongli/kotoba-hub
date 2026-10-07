export interface AuthEnv {
  secret: string;
  googleId: string;
  googleSecret: string;
}

export function readAuthEnv(
  environment: { AUTH_SECRET?: string; AUTH_GOOGLE_ID?: string; AUTH_GOOGLE_SECRET?: string } = {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  },
): AuthEnv {
  const secret = environment.AUTH_SECRET;
  const googleId = environment.AUTH_GOOGLE_ID;
  const googleSecret = environment.AUTH_GOOGLE_SECRET;

  if (!secret || secret.length < 32) throw new Error('AUTH_SECRET must be at least 32 characters.');
  if (!googleId) throw new Error('AUTH_GOOGLE_ID is required.');
  if (!googleSecret) throw new Error('AUTH_GOOGLE_SECRET is required.');

  return { secret, googleId, googleSecret };
}
