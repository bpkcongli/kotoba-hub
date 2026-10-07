import type { AuthUser, AuthUserAttributes } from '@/backend/users/domain/entities/auth-user';

export type CreateAuthUser = Omit<AuthUserAttributes, 'createdAt'>;
export type UpdateAuthUser = Partial<Omit<CreateAuthUser, 'id'>> & Pick<CreateAuthUser, 'id'>;

export interface AuthUserPort {
  create(input: CreateAuthUser): Promise<AuthUser>;

  findById(id: string): Promise<AuthUser | null>;

  findByEmail(email: string): Promise<AuthUser | null>;

  update(input: UpdateAuthUser): Promise<AuthUser>;

  recordLogin(id: string): Promise<void>;

  isOnboardingComplete(id: string): Promise<boolean>;
}
