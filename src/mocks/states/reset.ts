const resetters = new Set<() => void>();

/** Register each stateful domain collection's reset alongside its handlers. */
export function registerMockStateReset(reset: () => void): () => void {
  resetters.add(reset);
  return () => {
    resetters.delete(reset);
  };
}

export function resetMockState(): void {
  for (const reset of resetters) reset();
}
