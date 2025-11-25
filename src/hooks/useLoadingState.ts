import { useState, useCallback } from 'react';

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

interface UseLoadingStateReturn extends LoadingState {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (message: string | null) => void;
  clearMessages: () => void;
  reset: () => void;
}

export function useLoadingState(): UseLoadingStateReturn {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    success: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, success: null }));
  }, []);

  const setSuccess = useCallback((message: string | null) => {
    setState(prev => ({ ...prev, success: message, error: null }));
  }, []);

  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, error: null, success: null }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      success: null,
    });
  }, []);

  return {
    ...state,
    setLoading,
    setError,
    setSuccess,
    clearMessages,
    reset,
  };
}

// Hook for async operations with automatic loading state management
export function useAsyncOperation<T = any>() {
  const { isLoading, error, success, setLoading, setError, setSuccess, clearMessages } = useLoadingState();

  const execute = useCallback(async (
    operation: () => Promise<T>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<T | null> => {
    setLoading(true);
    clearMessages();

    try {
      const result = await operation();
      
      if (options?.successMessage) {
        setSuccess(options.successMessage);
      }
      
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
      const message = options?.errorMessage || error.message;
      
      setError(message);
      options?.onError?.(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setSuccess, clearMessages]);

  return {
    execute,
    isLoading,
    error,
    success,
    clearMessages,
    reset,
  };
}
