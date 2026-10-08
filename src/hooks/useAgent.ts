import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BaseResponse,
  CandidateSite,
  IntentRequest,
  IntentResponse,
  LlmPayloadRequest,
  LlmPayloadResponse,
  PrepareRequest,
  PrepareResponse,
  RunDetail,
  RunImportRequest,
  RunImportResponse,
  RunSummary,
  SiteAuthInfo,
  SiteContext,
} from '@sudobility/raidr_agent_types';
import type { McpManifest } from '@sudobility/raidr_types';
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

/**
 * `POST /intent` as a mutation: the request (with the device context) in,
 * the understood intent and ranked candidate sites out.
 */
export function useUnderstandIntent(
  networkClient: NetworkClient,
  baseUrl: string,
  getToken: TokenGetter
) {
  const client = useClient(networkClient, baseUrl);
  return useMutation<IntentResponse, Error, IntentRequest>({
    mutationFn: async body =>
      unwrap(
        await client.understandIntent(body, await required(getToken)),
        'understand the request'
      ),
  });
}

/** @deprecated Use {@link useUnderstandIntent}; a string is sent as `{ request }`. */
export function useClassifyIntent(
  networkClient: NetworkClient,
  baseUrl: string,
  getToken: TokenGetter
) {
  const client = useClient(networkClient, baseUrl);
  return useMutation<IntentResponse, Error, string | IntentRequest>({
    mutationFn: async request =>
      unwrap(
        await client.classifyIntent(request, await required(getToken)),
        'understand the request'
      ),
  });
}

/** `POST /prepare` as a mutation: chosen sites in, site plans and the merged form out. */
export function usePrepare(
  networkClient: NetworkClient,
  baseUrl: string,
  getToken: TokenGetter
) {
  const client = useClient(networkClient, baseUrl);
  return useMutation<PrepareResponse, Error, PrepareRequest>({
    mutationFn: async body =>
      unwrap(
        await client.prepare(body, await required(getToken)),
        'prepare the sites'
      ),
  });
}

/** One site's context (manifest, tool auth, page routes), fetched when `apiHost` is set. */
export function useSiteContext(
  networkClient: NetworkClient,
  baseUrl: string,
  getToken: TokenGetter,
  apiHost: string | null
) {
  const client = useClient(networkClient, baseUrl);
  return useQuery<SiteContext, Error>({
    queryKey: QUERY_KEYS.siteContext(apiHost ?? ''),
    queryFn: async () =>
      unwrap(
        await client.getSiteContext(apiHost!, await required(getToken)),
        'load the site'
      ),
    enabled: !!apiHost,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
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

// --- Local mode ---

/**
 * `POST /llm/payload` as a mutation: one agent step in, the provider request
 * (to send with the user's own key) out.
 */
export function useLlmPayload(
  networkClient: NetworkClient,
  baseUrl: string,
  getToken: TokenGetter
) {
  const client = useClient(networkClient, baseUrl);
  return useMutation<LlmPayloadResponse, Error, LlmPayloadRequest>({
    mutationFn: async body =>
      unwrap(
        await client.getLlmPayload(body, await required(getToken)),
        'prepare the model request'
      ),
  });
}

/** The candidate sites for an intent's labels; runs when `labels` is set. */
export function useCandidates(
  networkClient: NetworkClient,
  baseUrl: string,
  getToken: TokenGetter,
  labels: string[] | null
) {
  const client = useClient(networkClient, baseUrl);
  return useQuery<CandidateSite[], Error>({
    queryKey: QUERY_KEYS.candidates(labels ?? []),
    queryFn: async () =>
      unwrap(
        await client.getCandidates(labels!, await required(getToken)),
        'load the sites'
      ),
    enabled: !!labels,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
  });
}

/** One site's MCP manifest, fetched when `apiHost` is set. */
export function useSiteManifest(
  networkClient: NetworkClient,
  baseUrl: string,
  getToken: TokenGetter,
  apiHost: string | null
) {
  const client = useClient(networkClient, baseUrl);
  return useQuery<McpManifest, Error>({
    queryKey: QUERY_KEYS.siteManifest(apiHost ?? ''),
    queryFn: async () =>
      unwrap(
        await client.getSiteManifest(apiHost!, await required(getToken)),
        'load the site'
      ),
    enabled: !!apiHost,
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
  });
}

/** `POST /runs/import` as a mutation; refreshes the run history on success. */
export function useImportRun(
  networkClient: NetworkClient,
  baseUrl: string,
  getToken: TokenGetter
) {
  const client = useClient(networkClient, baseUrl);
  const queryClient = useQueryClient();
  return useMutation<RunImportResponse, Error, RunImportRequest>({
    mutationFn: async run =>
      unwrap(
        await client.importRun(run, await required(getToken)),
        'save the run'
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.runs() }),
  });
}
