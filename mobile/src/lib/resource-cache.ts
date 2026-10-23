const resourceCache = new Map<string, unknown>();

export function primeResource<T>(path: string, data: T, identity: number | null = null): void {
  resourceCache.set(path + '|' + (identity ?? 'null'), data);
}

export function getCachedResource<T>(path: string, identity: number | null = null): T | undefined {
  return resourceCache.get(path + '|' + (identity ?? 'null')) as T | undefined;
}

export function clearResourceCache(): void {
  resourceCache.clear();
}

