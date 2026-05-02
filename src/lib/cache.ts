/**
 * Простой кэш с localStorage.
 * Показываем старые данные сразу, обновляем в фоне.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 минут

export function getCached<T>(key: string, ttl: number = DEFAULT_TTL): T | null {
  try {
    const raw = localStorage.getItem(`lola_cache_${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ttl) {
      localStorage.removeItem(`lola_cache_${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCached<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(`lola_cache_${key}`, JSON.stringify(entry));
  } catch {
    // localStorage full — игнорируем
  }
}

export function clearCached(key: string): void {
  try {
    localStorage.removeItem(`lola_cache_${key}`);
  } catch {
    // ignore
  }
}
