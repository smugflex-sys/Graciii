import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface UseOptimizedDataOptions<T> {
  initialData?: T;
  cacheKey?: string;
  staleTime?: number;
  refetchInterval?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface OptimizedDataResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  mutate: (newData: T) => void;
}

// Simple cache implementation
const cache = new Map<string, { data: any; timestamp: number }>();

export function useOptimizedData<T>(
  fetchFn: () => Promise<T>,
  options: UseOptimizedDataOptions<T> = {}
): OptimizedDataResult<T> {
  const {
    initialData,
    cacheKey,
    staleTime = 5 * 60 * 1000, // 5 minutes
    refetchInterval,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeFetch = useCallback(async (skipCache = false) => {
    // Check cache first
    if (cacheKey && !skipCache) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < staleTime) {
        setData(cached.data);
        return;
      }
    }

    // Cancel previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      
      // Cache the result
      if (cacheKey) {
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
      }

      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fetch failed');
      setError(error);
      onError?.(error);
      
      // Only show toast for network errors, not cancellation
      if (error.name !== 'AbortError') {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [fetchFn, cacheKey, staleTime, onSuccess, onError]);

  const refetch = useCallback(() => executeFetch(true), [executeFetch]);

  const mutate = useCallback((newData: T) => {
    setData(newData);
    if (cacheKey) {
      cache.set(cacheKey, { data: newData, timestamp: Date.now() });
    }
  }, [cacheKey]);

  // Initial fetch
  useEffect(() => {
    executeFetch();
  }, [executeFetch]);

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval) return;

    const interval = setInterval(() => {
      executeFetch(true);
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, executeFetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { data, loading, error, refetch, mutate };
}

// Prefetch utility
export const prefetchData = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  staleTime = 5 * 60 * 1000
) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < staleTime) {
    return cached.data;
  }

  try {
    const data = await fetchFn();
    cache.set(key, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.warn(`Failed to prefetch ${key}:`, error);
  }
};

// Cache invalidation
export const invalidateCache = (key?: string) => {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
};

// Batch data fetching
export const useBatchData = <T extends Record<string, any>>(
  fetchFunctions: { [K in keyof T]: () => Promise<T[K]> }
) => {
  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof T, Error>>>({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const results: Partial<T> = {};
    const newErrors: Partial<Record<keyof T, Error>> = {};

    await Promise.allSettled(
      Object.entries(fetchFunctions).map(async ([key, fetchFn]) => {
        try {
          const result = await fetchFn();
          results[key as keyof T] = result;
        } catch (error) {
          newErrors[key as keyof T] = error instanceof Error ? error : new Error('Fetch failed');
        }
      })
    );

    setData(results);
    setErrors(newErrors);
    setLoading(false);
  }, [fetchFunctions]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, loading, errors, refetch: fetchAll };
};
