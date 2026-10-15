export function definitiveAuthFailure(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 401;
}

/** Every selection, close and unmount invalidates all older work. */
export function createGeneration() {
  let generation = 0;
  return {
    begin() { const own = ++generation; return () => own === generation; },
    capture() { const own = generation; return () => own === generation; },
  };
}
