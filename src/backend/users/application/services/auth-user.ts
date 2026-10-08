import type { AuthUserPort } from '@/backend/users/application/ports/auth-user.port';
import type { AuthUser } from '@/backend/users/domain/entities/auth-user';
import type {
  AuthUserRepository,
  CreateAuthUser,
  UpdateAuthUser,
} from '@/backend/users/domain/repositories/auth-user.repository';

export class AuthUserService implements AuthUserPort {
  constructor(private readonly repository: AuthUserRepository) {}

  create(input: CreateAuthUser): Promise<AuthUser> {
    return this.repository.create(input);
  }

  findById(id: string): Promise<AuthUser | null> {
    return this.repository.findById(id);
  }

  findByEmail(email: string): Promise<AuthUser | null> {
    return this.repository.findByEmail(email);
  }

  update(input: UpdateAuthUser): Promise<AuthUser> {
    return this.repository.update(input);
  }

  recordLogin(id: string): Promise<void> {
    return this.repository.recordLogin(id);
  }

  isOnboardingComplete(id: string): Promise<boolean> {
    return this.repository.isOnboardingComplete(id);
  }
}
