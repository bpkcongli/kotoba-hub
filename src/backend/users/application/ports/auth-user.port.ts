import type { AuthUser } from '@/backend/users/domain/entities/auth-user';
import type {
  CreateAuthUser,
  UpdateAuthUser,
} from '@/backend/users/domain/repositories/auth-user.repository';

export interface AuthUserPort {
  create(input: CreateAuthUser): Promise<AuthUser>;

  findById(id: string): Promise<AuthUser | null>;

  findByEmail(email: string): Promise<AuthUser | null>;

  update(input: UpdateAuthUser): Promise<AuthUser>;

  recordLogin(id: string): Promise<void>;

  isOnboardingComplete(id: string): Promise<boolean>;
}
