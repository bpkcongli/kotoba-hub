export interface AuthUserAttributes {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: Date;
}

export class AuthUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly emailVerified: boolean;
  readonly createdAt: Date;

  constructor(attributes: AuthUserAttributes) {
    this.id = attributes.id;
    this.email = attributes.email;
    this.displayName = attributes.displayName;
    this.avatarUrl = attributes.avatarUrl;
    this.emailVerified = attributes.emailVerified;
    this.createdAt = attributes.createdAt;
  }
}
