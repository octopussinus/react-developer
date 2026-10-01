import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

/**
 * Caching, retry and invalidation policy lives here once. Features declare
 * query keys and leave the strategy alone -- the alternative is N improvised
 * retry policies, one per feature.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && !error.isRetryable) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
