const MINUTE_MS = 60 * 1000;
export const MIN_DELAY_MS = 1 * MINUTE_MS;
export const MAX_DELAY_MS = 14 * MINUTE_MS;

/**
 * Pings `url` at a random interval between 1 and 14 minutes, so a host that sleeps idle services
 * (Render's free plan sleeps after 15 minutes without traffic) keeps this one awake.
 * The URL must be the public one: only traffic through the host's proxy counts as activity.
 * Returns a function that stops the pings.
 */
export function startKeepAlive(url: string, fetchFn: typeof fetch = fetch): () => void {
  let timer: NodeJS.Timeout;
  const schedule = () => {
    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    timer = setTimeout(async () => {
      try {
        const res = await fetchFn(url, { signal: AbortSignal.timeout(30_000) });
        if (!res.ok) console.warn(`keep-alive: ${url} answered ${res.status}`);
      } catch (err) {
        console.warn(`keep-alive: ${url} failed: ${(err as Error).message}`);
      }
      schedule();
    }, delay);
    // The HTTP server keeps the process alive; the pings alone should not.
    timer.unref();
  };
  schedule();
  return () => clearTimeout(timer);
}
