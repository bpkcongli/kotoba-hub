import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { RedirectPath } from '@/backend/auth/domain/value-objects/redirect-path';
import { createAuthJsAdapter } from '@/backend/auth/interface/secondary/persistence/authjs-adapter';
import { authUserService } from '@/backend/users/infrastructure/di/auth-user';
import { SESSION_COOKIE_NAME } from './auth-cookie';

export const { handlers, signIn, signOut } = NextAuth({
  basePath: '/api/v1/auth',
  secret: process.env.AUTH_SECRET || 'build-only-placeholder-not-valid-for-runtime',
  trustHost: true,
  adapter: createAuthJsAdapter(authUserService),
  session: { strategy: 'database' },
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || 'build-only-placeholder',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || 'build-only-placeholder',
      checks: ['pkce', 'state'],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified ? new Date() : null,
        };
      },
    }),
  ],
  callbacks: {
    signIn({ account, profile }) {
      return account?.provider === 'google' && profile?.email_verified === true;
    },
    redirect({ url, baseUrl }) {
      const target = new URL(url, baseUrl);
      if (target.origin !== baseUrl || !RedirectPath.create(target.pathname + target.search))
        return baseUrl;
      return target.toString();
    },
  },
  events: {
    async signIn({ user, profile }) {
      if (profile?.email_verified === true && user.id) {
        await authUserService.update({ id: user.id, emailVerified: true });
      }
    },
  },
});
