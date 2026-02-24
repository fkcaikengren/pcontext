import { useSearchParams } from 'react-router';
import { useMemo, useCallback } from 'react';

/**
 * A custom hook to manage state in the URL query parameters.
 * SSR-safe replacement for useUrlState.
 * 
 * @param initialState - The initial state object with default values.
 * @returns [state, setState] - The current state and a function to update it.
 */
export function useUrlState<T extends Record<string, string>>(initialState: T) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current state from URL params, falling back to initial state
  const state = useMemo(() => {
    const currentState: Record<string, string> = {};
    Object.keys(initialState).forEach(key => {
      currentState[key] = searchParams.get(key) || initialState[key];
    });
    return currentState as T;
  }, [searchParams, initialState]);

  // Update state function
  const setState = useCallback((newState: Partial<T> | ((prev: T) => Partial<T>)) => {
    setSearchParams(prev => {
      const nextState = typeof newState === 'function' ? newState(state) : newState;
      
      Object.entries(nextState).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          prev.delete(key);
        } else {
          prev.set(key, value as string);
        }
      });
      
      return prev;
    }, { replace: true });
  }, [searchParams, state, setSearchParams]);

  return [state, setState] as const;
}

/**
 * A custom hook to manage source type in the URL query parameters.
 * Supports 'github', 'gitee', and 'website' source types.
 * 
 * @param defaultSource - The default source type (defaults to 'github').
 * @returns [source, setSource] - The current source and a function to update it.
 */
export function useSourceState(defaultSource: 'github' | 'gitee' | 'website' = 'github') {
  const [searchParams, setSearchParams] = useSearchParams();

  const source = useMemo(() => {
    const sourceParam = searchParams.get('source');
    if (sourceParam === 'github' || sourceParam === 'gitee' || sourceParam === 'website') {
      return sourceParam;
    }
    return defaultSource;
  }, [searchParams, defaultSource]);

  const setSource = useCallback((newSource: 'github' | 'gitee' | 'website') => {
    setSearchParams(prev => {
      prev.set('source', newSource);
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  return [source, setSource] as const;
}
