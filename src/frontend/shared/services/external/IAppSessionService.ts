import type { AppSession } from '@/frontend/shared/interfaces/entities';

export interface IAppSessionService {
  getSession(signal?: AbortSignal): Promise<AppSession>;

  signOut(signal?: AbortSignal): Promise<void>;
}
