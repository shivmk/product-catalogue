import { describe, expect, it, vi } from 'vitest';
import { cachedLoader } from '../src/adapters/fakeStore/cachedLoader.js';

function clock(start = 0) {
  let time = start;
  return { now: () => time, advance: (ms: number) => (time += ms) };
}

describe('cachedLoader', () => {
  it('reuses the value within the TTL and reloads after it', async () => {
    const time = clock();
    const load = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');
    const get = cachedLoader(load, { ttlMs: 1000, now: time.now });

    expect(await get()).toBe('first');
    time.advance(999);
    expect(await get()).toBe('first');
    time.advance(1);
    expect(await get()).toBe('second');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight load between concurrent callers', async () => {
    const load = vi.fn().mockResolvedValue('value');
    const get = cachedLoader(load, { ttlMs: 1000 });

    await Promise.all([get(), get(), get()]);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('serves the stale value when a refresh fails', async () => {
    const time = clock();
    const onStaleServed = vi.fn();
    const load = vi.fn().mockResolvedValueOnce('good').mockRejectedValueOnce(new Error('down'));
    const get = cachedLoader(load, { ttlMs: 1000, now: time.now, onStaleServed });

    await get();
    time.advance(5000);

    expect(await get()).toBe('good');
    expect(onStaleServed).toHaveBeenCalledOnce();
  });

  it('throws when the first load fails, and retries on the next call', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce('ok');
    const get = cachedLoader(load, { ttlMs: 1000 });

    await expect(get()).rejects.toThrow('down');
    expect(await get()).toBe('ok');
  });
});
