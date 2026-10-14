type CacheEntry = { expiresAt: number; promise: Promise<unknown> };

const globalForTtlCache = globalThis as unknown as { appTtlCache?: Map<string, CacheEntry> };

const MAX_ENTRIES = 200;

function getStore(): Map<string, CacheEntry> {
  globalForTtlCache.appTtlCache ??= new Map<string, CacheEntry>();
  return globalForTtlCache.appTtlCache;
}

/**
 * Cache bộ nhớ theo thời gian sống cho các truy vấn đọc nặng và ít thay đổi.
 * Các lần gọi đồng thời dùng chung một truy vấn, và lỗi không bị lưu lại.
 */
export function ttlCached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const store = getStore();
  const now = Date.now();
  const hit = store.get(key);

  if (hit && hit.expiresAt > now) {
    return hit.promise as Promise<T>;
  }

  const promise = loader();
  store.set(key, { expiresAt: now + ttlMs, promise });

  promise.catch(() => {
    if (store.get(key)?.promise === promise) {
      store.delete(key);
    }
  });

  if (store.size > MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) {
      store.delete(oldestKey);
    }
  }

  return promise;
}

export function invalidateTtlCache(prefix: string): void {
  const store = getStore();

  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}
