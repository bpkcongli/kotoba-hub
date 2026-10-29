import {
  actionBound,
  computed,
  makeObservable,
  observable,
  observableRef,
  runInAction,
} from 'mobx';
import { ClientException } from '@/frontend/shared/exceptions';
import { presentError } from '@/frontend/shared/helpers';
import type { StoreError } from '@/frontend/shared/interfaces';
import { anonymousAppSession, type AppSession } from '@/frontend/shared/interfaces/entities';
import { appSessionSchema } from '@/frontend/shared/interfaces/responses';
import type { IAppSessionService } from '@/frontend/shared/services/external';
import type { IAppSessionStore } from '@/frontend/shared/services/internal/IAppSessionStore';

export class AppSessionStore implements IAppSessionStore {
  snapshot: AppSession | null = null;

  isLoading = false;
  isSigningOut = false;
  error: StoreError | null = null;

  private loadController: AbortController | null = null;
  private signOutController: AbortController | null = null;

  constructor(
    private readonly service: IAppSessionService,
    initial?: AppSession,
  ) {
    if (initial) this.snapshot = this.readSnapshot(initial);

    makeObservable(this, {
      snapshot: observableRef,
      isLoading: observable,
      isSigningOut: observable,
      error: observableRef,

      sessionIdentity: computed,

      hydrate: actionBound,
      load: actionBound,
      signOut: actionBound,
      dispose: actionBound,
    });
  }

  get sessionIdentity(): string {
    return this.snapshot?.user ? `${this.snapshot.user.id}:${this.snapshot.sessionId}` : 'visitor';
  }

  hydrate(snapshot: AppSession): void {
    const next = this.readSnapshot(snapshot);

    this.dispose();

    this.snapshot = next;
    this.error = null;
  }

  async load(): Promise<void> {
    if (this.isSigningOut) return;

    this.loadController?.abort();

    const controller = new AbortController();
    this.loadController = controller;

    this.isLoading = true;
    this.error = null;

    try {
      const session = await this.service.getSession(controller.signal);

      runInAction(() => {
        if (this.loadController === controller && !controller.signal.aborted) {
          this.snapshot = this.readSnapshot(session);
        }
      });
    } catch (error: unknown) {
      runInAction(() => {
        if (this.loadController !== controller || controller.signal.aborted) return;

        if (!(error instanceof ClientException && error.kind === 'cancelled')) {
          this.error = presentError(error);
        }
      });
    } finally {
      runInAction(() => {
        if (this.loadController !== controller) return;

        this.loadController = null;
        this.isLoading = false;
      });
    }
  }

  async signOut(): Promise<boolean> {
    if (this.isSigningOut) return false;

    this.loadController?.abort();
    this.loadController = null;
    this.isLoading = false;

    const controller = new AbortController();
    this.signOutController = controller;

    this.isSigningOut = true;
    this.error = null;

    try {
      await this.service.signOut(controller.signal);

      let applied = false;

      runInAction(() => {
        if (this.signOutController !== controller || controller.signal.aborted) return;

        this.snapshot = anonymousAppSession();
        applied = true;
      });

      return applied;
    } catch (error: unknown) {
      runInAction(() => {
        if (this.signOutController !== controller || controller.signal.aborted) return;

        if (!(error instanceof ClientException && error.kind === 'cancelled')) {
          this.error = presentError(error);
        }
      });

      return false;
    } finally {
      runInAction(() => {
        if (this.signOutController !== controller) return;

        this.signOutController = null;
        this.isSigningOut = false;
      });
    }
  }

  dispose(): void {
    this.loadController?.abort();
    this.signOutController?.abort();

    this.loadController = null;
    this.signOutController = null;

    this.isLoading = false;
    this.isSigningOut = false;
  }

  private readSnapshot(snapshot: AppSession): AppSession {
    const parsed = appSessionSchema.safeParse(snapshot);

    if (!parsed.success) {
      throw new ClientException('contract', 'The session could not be read. Please try again.');
    }

    return parsed.data;
  }
}
