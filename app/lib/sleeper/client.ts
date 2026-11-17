const SLEEPER_API = "https://api.sleeper.app/v1";
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

type ClientOptions = {
  fetcher?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  concurrency?: number;
  timeoutMs?: number;
};

export function createSleeperClient({
  fetcher = fetch,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  concurrency = 4,
  timeoutMs = 15_000,
}: ClientOptions = {}) {
  let active = 0;
  const waiters: Array<() => void> = [];
  return async function sleeperFetch<T>(path: string): Promise<T> {
    if (active < concurrency) active += 1;
    else await new Promise<void>((resolve) => waiters.push(resolve));
    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        let delay = 500 * 2 ** attempt;
        let response: Response;
        try {
          response = await fetcher(`${SLEEPER_API}${path}`, {
            headers: { Accept: "application/json" },
            cache: "no-store",
            signal: AbortSignal.timeout(timeoutMs),
          });
          if (response.ok) return (await response.json()) as T;
        } catch (error) {
          if (attempt === 2)
            throw new Error(`Sleeper request failed for ${path}`, {
              cause: error,
            });
          await sleep(delay);
          continue;
        }
        const retryAfter = response.headers.get("retry-after");
        if (retryAfter) {
          const seconds = Number(retryAfter);
          const milliseconds = Number.isFinite(seconds)
            ? seconds * 1000
            : Date.parse(retryAfter) - Date.now();
          if (Number.isFinite(milliseconds))
            delay = Math.max(0, Math.min(milliseconds, 10_000));
        }
        await response.body?.cancel();
        if (!RETRYABLE_STATUS.has(response.status) || attempt === 2) {
          throw new Error(`Sleeper returned ${response.status} for ${path}`);
        }
        await sleep(delay);
      }
      throw new Error(`Sleeper did not answer ${path}`);
    } finally {
      // Hand the existing slot to a waiter before admitting another caller.
      const next = waiters.shift();
      if (next) next();
      else active -= 1;
    }
  };
}

export const sleeperFetch = createSleeperClient();
