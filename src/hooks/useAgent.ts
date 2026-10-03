import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  BaseResponse,
  IntentResponse,
  RunDetail,
  RunSummary,
  SiteAuthInfo,
} from '@sudobility/raidr_agent_types';
import type { NetworkClient } from '@sudobility/types';
import { RaidrAgentClient } from '../network/RaidrAgentClient';
import { DEFAULT_GC_TIME, DEFAULT_STALE_TIME, QUERY_KEYS } from '../types';

/** The caller's Firebase ID token, fetched fresh for each request. */
export type TokenGetter = () => Promise<string | null>;

function useClient(networkClient: NetworkClient, baseUrl: string) {
  return useMemo(
    () => new RaidrAgentClient({ baseUrl, networkClient }),
    [baseUrl, networkClient]
  );
}

async function required(getToken: TokenGetter): Promise<string> {
  const token = await getToken();
  if (!token) throw new Error('Sign in first');
  return token;
}

function unwrap<T>(response: BaseResponse<T>, what: string): T {
  if (
    !response.success ||
    response.data === undefined ||
    response.data === null
  ) {
    throw new Error(response.error || `Failed to ${what}`);
  }
  return response.data;
}

/** `POST /intent` as a mutation: request text in, intent and candidate sites out. */
export function useClassifyIntent(
  networkClient: NetworkClient,
  baseUrl: string,
  getToken: TokenGetter
) {
  const client = useClient(networkClient, baseUrl);
  return useMutation<IntentResponse, Error, string>({
    mutationFn: async request =>
      unwrap(
        await client.classifyIntent(request, await required(getToken)),
        'classify the request'
      ),
  });
}

/** One site's sign-in details, fetched when `apiHost` is set. */
export function useSiteAuth(
  networkClient: NetworkClient,
  baseUrl: string,
  getToken: TokenGetter,
  apiHost: string | null
) {
  const client = useClient(networkClient, baseUrl);
  return useQuery<SiteAuthInfo, Error>({
    queryKey: QUERY_KEYS.siteAuth(apiHost ?? ''),
    queryFn: async () =>
      unwrap(
        await client.getSiteAuth(apiHost!, await required(getToken)),
        'load the sign-in details'
      ),
    enabled: !!apiHost,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
  });
}

export function useRuns(
  networkClient: NetworkClient,
  baseUrl: string,
  getToken: TokenGetter,
  options?: { enabled?: boolean }
) {
  const client = useClient(networkClient, baseUrl);
  return useQuery<RunSummary[], Error>({
    queryKey: QUERY_KEYS.runs(),
    queryFn: async () =>
      unwrap(
        await client.getRuns(await required(getToken)),
        'load the run history'
      ),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    gcTime: DEFAULT_GC_TIME,
  });
}

export function useRun(
  networkClient: NetworkClient,
  baseUrl: string,
  getToken: TokenGetter,
  runId: string | null
) {
  const client = useClient(networkClient, baseUrl);
  return useQuery<RunDetail, Error>({
    queryKey: QUERY_KEYS.run(runId ?? ''),
    queryFn: async () =>
      unwrap(
        await client.getRun(runId!, await required(getToken)),
        'load the run'
      ),
    enabled: !!runId,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
  });
}
