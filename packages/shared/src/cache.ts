type Entry<T> = { value: T; expiresAt: number };

export class TtlCache {
  private map = new Map<string, Entry<any>>();

  get<T>(key: string): T | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (Date.now() > e.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return e.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number) {
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

export const globalCache = new TtlCache();
