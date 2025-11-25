import { useState, useEffect, useCallback, useRef } from 'react';

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseOptimizedFetchOptions<T> {
  initialData?: T;
  enabled?: boolean;
  debounceMs?: number;
  cacheKey?: string;
  cacheExpiry?: number; // in milliseconds
}

export function useOptimizedFetch<T>(
  fetchFn: () => Promise<T>,
  options: UseOptimizedFetchOptions<T> = {}
) {
  const {
    initialData,
    enabled = true,
    cacheKey,
    cacheExpiry = 5 * 60 * 1000, // 5 minutes default cache
  } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);
  const lastFetched = useRef<number>(0);

  // Cache implementation
  const getCachedData = useCallback((): T | null => {
    if (!cacheKey) return null;
    
    try {
      const cached = localStorage.getItem(`cache_${cacheKey}`);
      if (!cached) return null;
      
      const { data: cachedData, timestamp } = JSON.parse(cached);
      
      // Check if cache is still valid
      if (Date.now() - timestamp < cacheExpiry) {
        return cachedData;
      }
      
      // Clear expired cache
      localStorage.removeItem(`cache_${cacheKey}`);
      return null;
    } catch (e) {
      console.warn('Failed to read from cache', e);
      return null;
    }
  }, [cacheKey, cacheExpiry]);

  const setCachedData = useCallback((newData: T) => {
    if (!cacheKey) return;
    
    try {
      localStorage.setItem(
        `cache_${cacheKey}`,
        JSON.stringify({
          data: newData,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.warn('Failed to write to cache', e);
    }
  }, [cacheKey]);

  const fetchData = useCallback(async () => {
    // Skip if already loading or not enabled
    if (status === 'loading' || !enabled) return;

    // Check cache first if cacheKey is provided
    if (cacheKey) {
      const cachedData = getCachedData();
      if (cachedData) {
        setData(cachedData);
        setStatus('success');
        return;
      }
    }

    setStatus('loading');
    
    try {
      const result = await fetchFn();
      
      if (!isMounted.current) return;
      
      setData(result);
      setStatus('success');
      setError(null);
      lastFetched.current = Date.now();
      
      // Update cache if cacheKey is provided
      if (cacheKey) {
        setCachedData(result);
      }
    } catch (err) {
      if (!isMounted.current) return;
      
      setError(err instanceof Error ? err : new Error('An error occurred'));
      setStatus('error');
    }
  }, [cacheKey, enabled, fetchFn, getCachedData, setCachedData, status]);

  // Note: Debounced refetch is available but not used by default
  // to avoid unnecessary re-renders. You can add it back if needed.
  // const debouncedRefetch = useCallback(
  //   debounce(() => {
  //     fetchData();
  //   }, debounceMs),
  //   [fetchData, debounceMs]
  // );

  // Initial fetch and cleanup
  useEffect(() => {
    isMounted.current = true;
    
    if (enabled) {
      // Only fetch if data is not in cache or cache is expired
      const cachedData = cacheKey ? getCachedData() : null;
      if (!cachedData || Date.now() - lastFetched.current > cacheExpiry) {
        fetchData();
      } else if (cachedData) {
        setData(cachedData);
        setStatus('success');
      }
    }

    return () => {
      isMounted.current = false;
    };
  }, [enabled, fetchData, cacheKey, getCachedData, cacheExpiry]);

  // Refetch function that can be called manually
  const refetch = useCallback(() => {
    if (status === 'loading') return Promise.resolve();
    return fetchData();
  }, [fetchData, status]);

  // Invalidate cache
  const invalidateCache = useCallback(() => {
    if (!cacheKey) return;
    localStorage.removeItem(`cache_${cacheKey}`);
  }, [cacheKey]);

  return {
    data,
    error,
    isLoading: status === 'loading',
    isError: status === 'error',
    isSuccess: status === 'success',
    refetch,
    invalidateCache,
    status,
  };
}
