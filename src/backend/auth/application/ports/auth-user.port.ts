export interface AuthUserSnapshot {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: Date;
}

export type CreateAuthUserInput = Omit<AuthUserSnapshot, 'createdAt'>;

export type UpdateAuthUserInput = Partial<Omit<CreateAuthUserInput, 'id'>> &
  Pick<CreateAuthUserInput, 'id'>;

export interface AuthUserPort {
  create(input: CreateAuthUserInput): Promise<AuthUserSnapshot>;

  findById(id: string): Promise<AuthUserSnapshot | null>;

  findByEmail(email: string): Promise<AuthUserSnapshot | null>;

  update(input: UpdateAuthUserInput): Promise<AuthUserSnapshot>;

  recordLogin(id: string): Promise<void>;

  isOnboardingComplete(id: string): Promise<boolean>;
}
