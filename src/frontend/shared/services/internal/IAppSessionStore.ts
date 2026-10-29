import type { StoreError } from '@/frontend/shared/interfaces';
import type { AppSession } from '@/frontend/shared/interfaces/entities';
import type { IDisposableStore, IHydratableStore } from '@/frontend/shared/interfaces/stores';

export interface IAppSessionStore extends IHydratableStore<AppSession>, IDisposableStore {
  readonly snapshot: AppSession | null;

  readonly isLoading: boolean;

  readonly isSigningOut: boolean;

  readonly error: StoreError | null;

  readonly sessionIdentity: string;

  load(): Promise<void>;

  signOut(): Promise<boolean>;
}
