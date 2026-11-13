import {useCallback,useState} from 'react';
import {useFocusEffect} from 'expo-router';
import {api} from './api.ts';
import {primeResource, getCachedResource, clearResourceCache} from './resource-cache.ts';

export {primeResource, getCachedResource, clearResourceCache};

export function useResource<T>(path: string | null, identity: number | null = null) {
  const [version, setVersion] = useState(0);
  const initial = path ? getCachedResource<T>(path, identity) : undefined;
  const [result, setResult] = useState<{key: string; data?: T; error?: Error}>({
    key: initial && path ? path + '|' + identity + '|0' : '',
    data: initial,
  });
  const key = path + '|' + identity + '|' + version;

  useFocusEffect(useCallback(() => {
    let active = true;
    if (path) {
      if (version === 0) {
        const cached = getCachedResource<T>(path, identity);
        if (cached !== undefined) {
          setResult({key, data: cached});
          return () => { active = false; };
        }
      }
      api<T>(path).then(data => {
        if (active) {
          primeResource(path, data, identity);
          setResult({key, data});
        }
      }).catch(error => {
        if (active) setResult({key, error});
      });
    }
    return () => { active = false; };
  }, [path, key, version, identity]));

  const cachedFallback = path && version === 0 ? getCachedResource<T>(path, identity) : undefined;
  const effectiveData = result.key === key ? result.data : cachedFallback;
  const hasData = effectiveData !== undefined;
  return {
    data: effectiveData,
    error: result.key === key ? result.error : undefined,
    loading: !!path && !hasData && (result.key !== key || (!result.data && !result.error)),
    retry: () => setVersion(v => v + 1)
  };
}
