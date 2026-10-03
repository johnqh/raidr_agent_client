import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { HealthCheckData, Optional } from '@sudobility/raidr_agent_types';
import type { NetworkClient } from '@sudobility/types';
import { RaidrAgentClient } from '../network/RaidrAgentClient';
import { DEFAULT_GC_TIME, DEFAULT_STALE_TIME, QUERY_KEYS } from '../types';

export interface UseHealthReturn {
  health: HealthCheckData | null;
  isLoading: boolean;
  error: Optional<string>;
  update: () => void;
}

/**
 * Placeholder TanStack Query hook for `GET /health`.
 *
 * Shows the hook pattern every domain hook should follow: build a memoized
 * {@link RaidrAgentClient}, key the query with {@link QUERY_KEYS}, unwrap the
 * `BaseResponse`, and return a memoized result object.
 */
export const useHealth = (
  networkClient: NetworkClient,
  baseUrl: string,
  options?: { enabled?: boolean }
): UseHealthReturn => {
  const client = useMemo(
    () => new RaidrAgentClient({ baseUrl, networkClient }),
    [baseUrl, networkClient]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.health(),
    queryFn: async () => {
      const response = await client.getHealth();
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch health');
      }
      return response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
  });

  return useMemo(
    () => ({
      health: data ?? null,
      isLoading,
      error: error instanceof Error ? error.message : null,
      update: refetch,
    }),
    [data, isLoading, error, refetch]
  );
};
