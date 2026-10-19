import type {
  AuthUserPort,
  AuthUserSnapshot,
  CreateAuthUserInput,
  UpdateAuthUserInput,
} from '@/backend/auth/application/ports/auth-user.port';
import type { AuthUserService } from '@/backend/users/application/services/auth-user.service';

export class AuthUserAdapter implements AuthUserPort {
  constructor(private readonly users: AuthUserService) {}

  create(input: CreateAuthUserInput): Promise<AuthUserSnapshot> {
    return this.users.create(input);
  }

  findById(id: string): Promise<AuthUserSnapshot | null> {
    return this.users.findById(id);
  }

  findByEmail(email: string): Promise<AuthUserSnapshot | null> {
    return this.users.findByEmail(email);
  }

  update(input: UpdateAuthUserInput): Promise<AuthUserSnapshot> {
    return this.users.update(input);
  }

  recordLogin(id: string): Promise<void> {
    return this.users.recordLogin(id);
  }

  isOnboardingComplete(id: string): Promise<boolean> {
    return this.users.isOnboardingComplete(id);
  }
}
