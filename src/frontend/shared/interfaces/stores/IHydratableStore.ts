export interface IHydratableStore<TSnapshot> {
  hydrate(snapshot: TSnapshot): void;
}
