export interface AuthSessionAttributes {
  id: string;
  userId: string;
  expiresAt: Date;
}

export class AuthSession {
  readonly id: string;
  readonly userId: string;
  private readonly expiration: Date;

  constructor(attributes: AuthSessionAttributes) {
    if (!attributes.id || !attributes.userId || Number.isNaN(attributes.expiresAt.getTime())) {
      throw new Error('Invalid auth session.');
    }

    this.id = attributes.id;
    this.userId = attributes.userId;
    this.expiration = new Date(attributes.expiresAt.getTime());
  }

  get expiresAt(): Date {
    return new Date(this.expiration);
  }

  isExpired(at: Date = new Date()): boolean {
    return this.expiration.getTime() <= at.getTime();
  }
}
