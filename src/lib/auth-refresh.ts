/** Serialize refresh across tabs; the lease is a best-effort fallback for old browsers. */
export async function withRefreshLock<T>(name: string, work: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request(name, work);
  }
  if (typeof window === "undefined") return work();
  const key = `${name}:lease`;
  const owner = `${Date.now()}:${Math.random()}`;
  const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const read = (): { owner: string; expires: number } | null => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  };
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    let acquired = false;
    try {
      const lease = read();
      if (!lease || lease.expires < Date.now()) {
        localStorage.setItem(key, JSON.stringify({ owner, expires: Date.now() + 15_000 }));
        await pause(60);
        acquired = read()?.owner === owner;
      }
    } catch {
      // Storage unavailable: keep the in-tab single flight; never clear auth here.
      return work();
    }
    if (acquired) {
      const renew = setInterval(() => {
        try {
          if (read()?.owner === owner) localStorage.setItem(key, JSON.stringify({ owner, expires: Date.now() + 15_000 }));
        } catch { /* storage became unavailable */ }
      }, 3000);
      try { return await work(); }
      finally {
        clearInterval(renew);
        try { if (read()?.owner === owner) localStorage.removeItem(key); } catch { /* storage unavailable */ }
      }
    }
    await pause(100);
  }
  throw new Error("A renovação da sessão está ocupada. Tente novamente.");
}
