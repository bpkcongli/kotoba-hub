import type { AuthUserService } from '@/backend/users/application/services/auth-user.service';
import type { AuthUser } from '@/backend/users/domain/entities/auth-user';
import type {
  AuthUserRepository,
  CreateAuthUser,
  UpdateAuthUser,
} from '@/backend/users/domain/repositories/auth-user.repository';

export class AuthUserServiceImpl implements AuthUserService {
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
