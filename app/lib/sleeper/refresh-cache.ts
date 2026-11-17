/** Coalesce refreshes and keep the last successful value through transient failures. */
export function createRefreshCache<T>(
  load: (previous: T | null) => Promise<T>,
  retryMs = 15 * 60 * 1000,
) {
  let value: T | null = null;
  let successfulSlot: string | null = null;
  let retryAt = 0;
  let pending: Promise<T> | null = null;
  return function get(slot: string, now = Date.now()): Promise<T> {
    if (value !== null && (successfulSlot === slot || now < retryAt))
      return Promise.resolve(value);
    if (pending) return pending;
    pending = load(value)
      .then((fresh) => {
        value = fresh;
        successfulSlot = slot;
        retryAt = 0;
        return fresh;
      })
      .catch((error: unknown) => {
        retryAt = now + retryMs;
        if (value !== null) return value;
        throw error;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };
}
