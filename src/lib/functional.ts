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

/** O token de redefinição vem no fragmento (#t=...): não vai para logs do servidor nem para o Referer. */
export function lerTokenDoFragmento(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("t");
  return token && token.length <= 200 ? token : null;
}
