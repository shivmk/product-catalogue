export interface CachedLoaderOptions {
  ttlMs: number;
  now?: () => number;
  /** Called when a refresh fails but a previous value can still be served. */
  onStaleServed?: (error: unknown) => void;
}

/**
 * Wraps an expensive async load with:
 * - a TTL cache,
 * - single-flight (concurrent callers share one in-flight load),
 * - stale-on-error (if a refresh fails, keep serving the last good value).
 */
export function cachedLoader<T>(
  load: () => Promise<T>,
  { ttlMs, now = Date.now, onStaleServed }: CachedLoaderOptions,
): () => Promise<T> {
  let value: { data: T; loadedAt: number } | undefined;
  let inFlight: Promise<T> | undefined;

  return async () => {
    if (value && now() - value.loadedAt < ttlMs) return value.data;
    if (inFlight) return inFlight;

    inFlight = load()
      .then((data) => {
        value = { data, loadedAt: now() };
        return data;
      })
      .catch((error: unknown) => {
        if (value) {
          onStaleServed?.(error);
          return value.data;
        }
        throw error;
      })
      .finally(() => {
        inFlight = undefined;
      });
    return inFlight;
  };
}
