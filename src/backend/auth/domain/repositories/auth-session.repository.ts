import type { AuthSession } from '@/backend/auth/domain/entities/auth-session';

export interface AuthSessionRepository {
  findByToken(token: string): Promise<AuthSession | null>;

  deleteByToken(token: string): Promise<void>;
}
