import type { NetworkClient } from '@sudobility/types';
import type {
  BaseResponse,
  CandidateSite,
  HealthCheckData,
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
  SiteIconResponse,
  SiteSearchHit,
  User,
} from '@sudobility/raidr_agent_types';
import type { McpManifest } from '@sudobility/raidr_types';
import type { FirebaseIdToken } from '../types';
import {
  buildUrl,
  createAuthHeaders,
  createHeaders,
} from '../utils/raidr-agent-helpers';

/**
 * Validates that a response from the API conforms to the expected {@link BaseResponse} shape.
 *
 * Performs a defensive check that the response has a `success` boolean field,
 * guarding against unexpected response shapes from the network layer.
 *
 * @param data - The raw response data from the network client
 * @param operation - Description of the operation, used in the error message if validation fails
 * @returns The validated response cast to `BaseResponse<T>`
 * @throws {Error} If the response does not have a `success` boolean field
 *
 * @internal
 */
function validateResponse<T>(
  data: unknown,
  operation: string
): BaseResponse<T> {
  if (
    data != null &&
    typeof data === 'object' &&
    'success' in data &&
    typeof (data as Record<string, unknown>).success === 'boolean'
  ) {
    return data as BaseResponse<T>;
  }
  throw new Error(
    `Invalid API response for ${operation}: response does not match expected BaseResponse shape`
  );
}

/**
 * HTTP client for the RaidrAgent API.
 *
 * Communicates with the RaidrAgent backend using dependency-injected {@link NetworkClient}.
 * All HTTP calls go through the injected `networkClient` -- this class never uses `fetch` directly.
 *
 * @example
 * ```typescript
 * import { RaidrAgentClient } from '@sudobility/raidr_agent_client';
 *
 * const client = new RaidrAgentClient({
 *   baseUrl: 'https://api.example.com',
 *   networkClient: myNetworkClient,
 * });
 *
 * // Fetch user profile
 * const user = await client.getUser(userId, idToken);
 * ```
 */
export class RaidrAgentClient {
  private readonly baseUrl: string;
  private readonly networkClient: NetworkClient;

  /**
   * Creates a new RaidrAgentClient instance.
   *
   * @param config - Client configuration
   * @param config.baseUrl - The base URL of the RaidrAgent API (e.g., `"https://api.example.com"`)
   * @param config.networkClient - A {@link NetworkClient} implementation for making HTTP requests
   */
  constructor(config: { baseUrl: string; networkClient: NetworkClient }) {
    this.baseUrl = config.baseUrl;
    this.networkClient = config.networkClient;
  }

  // --- Health (public) ---

  /**
   * Fetches the API health status. Placeholder endpoint for the scaffold.
   *
   * @returns The health payload wrapped in a {@link BaseResponse}
   * @throws {Error} If the response does not match the expected shape
   */
  async getHealth(options?: {
    timeout?: number;
  }): Promise<BaseResponse<HealthCheckData>> {
    const url = buildUrl(this.baseUrl, '/health');
    const response = await this.networkClient.get(url, {
      headers: createHeaders(),
      timeout: options?.timeout,
    });
    return validateResponse<HealthCheckData>(response.data, 'getHealth');
  }

  // --- User ---

  /**
   * Fetches a user profile by ID.
   *
   * @param userId - The Firebase UID of the user to fetch
   * @param token - A valid Firebase ID token for authentication
   * @returns The user profile wrapped in a {@link BaseResponse}
   * @throws {Error} If the response does not match the expected shape
   *
   * @example
   * ```typescript
   * const response = await client.getUser('user-123', idToken);
   * if (response.success && response.data) {
   *   console.log(response.data.email);
   * }
   * ```
   */
  async getUser(
    userId: string,
    token: FirebaseIdToken,
    options?: { timeout?: number }
  ): Promise<BaseResponse<User>> {
    const url = buildUrl(this.baseUrl, `/api/v1/users/${userId}`);
    const response = await this.networkClient.get(url, {
      headers: createAuthHeaders(token),
      timeout: options?.timeout,
    });
    return validateResponse<User>(response.data, 'getUser');
  }

  // --- Agent flow ---

  /**
   * Understand a request (six W's, selection mode) and list the sites that
   * can answer it, ranked with a reason each (`POST /intent`). Send the
   * device context (`country`, `locale`, `timeZone`, `now`) with it.
   */
  async understandIntent(
    body: IntentRequest,
    token: FirebaseIdToken,
    options?: { timeout?: number }
  ): Promise<BaseResponse<IntentResponse>> {
    const url = buildUrl(this.baseUrl, '/api/v1/intent');
    const response = await this.networkClient.post(url, body, {
      headers: createAuthHeaders(token),
      timeout: options?.timeout ?? 60_000,
    });
    return validateResponse<IntentResponse>(response.data, 'understandIntent');
  }

  /** @deprecated Use {@link understandIntent}; a string is sent as `{ request }`. */
  async classifyIntent(
    request: string | IntentRequest,
    token: FirebaseIdToken,
    options?: { timeout?: number }
  ): Promise<BaseResponse<IntentResponse>> {
    return this.understandIntent(
      typeof request === 'string' ? { request } : request,
      token,
      options
    );
  }

  /**
   * Prepare the chosen sites (`POST /prepare`): per site the tools to call,
   * whether to sign in and why, or why it cannot help; plus one merged form.
   */
  async prepare(
    body: PrepareRequest,
    token: FirebaseIdToken,
    options?: { timeout?: number }
  ): Promise<BaseResponse<PrepareResponse>> {
    const url = buildUrl(this.baseUrl, '/api/v1/prepare');
    const response = await this.networkClient.post(url, body, {
      headers: createAuthHeaders(token),
      timeout: options?.timeout ?? 90_000,
    });
    return validateResponse<PrepareResponse>(response.data, 'prepare');
  }

  /**
   * Everything the agent needs about one site (`GET /sites/:apiHost/context`):
   * its manifest, per-tool auth and page routes. Local mode uses it as the
   * runner's `SiteContextSource`.
   */
  async getSiteContext(
    apiHost: string,
    token: FirebaseIdToken,
    options?: { timeout?: number }
  ): Promise<BaseResponse<SiteContext>> {
    const url = buildUrl(
      this.baseUrl,
      `/api/v1/sites/${encodeURIComponent(apiHost)}/context`
    );
    const response = await this.networkClient.get(url, {
      headers: createAuthHeaders(token),
      timeout: options?.timeout,
    });
    return validateResponse<SiteContext>(response.data, 'getSiteContext');
  }

  /** How to sign the user in to a site and recognise its token. */
  async getSiteAuth(
    apiHost: string,
    token: FirebaseIdToken,
    options?: { timeout?: number }
  ): Promise<BaseResponse<SiteAuthInfo>> {
    const url = buildUrl(
      this.baseUrl,
      `/api/v1/sites/${encodeURIComponent(apiHost)}/auth`
    );
    const response = await this.networkClient.get(url, {
      headers: createAuthHeaders(token),
      timeout: options?.timeout,
    });
    return validateResponse<SiteAuthInfo>(response.data, 'getSiteAuth');
  }

  async getRuns(
    token: FirebaseIdToken,
    options?: { timeout?: number }
  ): Promise<BaseResponse<RunSummary[]>> {
    const url = buildUrl(this.baseUrl, '/api/v1/runs');
    const response = await this.networkClient.get(url, {
      headers: createAuthHeaders(token),
      timeout: options?.timeout,
    });
    return validateResponse<RunSummary[]>(response.data, 'getRuns');
  }

  async getRun(
    runId: string,
    token: FirebaseIdToken,
    options?: { timeout?: number }
  ): Promise<BaseResponse<RunDetail>> {
    const url = buildUrl(
      this.baseUrl,
      `/api/v1/runs/${encodeURIComponent(runId)}`
    );
    const response = await this.networkClient.get(url, {
      headers: createAuthHeaders(token),
      timeout: options?.timeout,
    });
    return validateResponse<RunDetail>(response.data, 'getRun');
  }

  // --- Local mode ---

  /**
   * The provider request for one agent step (`POST /llm/payload`). The app
   * adds the user's own key and calls the provider itself; for `understand`
   * send `input: { request, country?, locale?, timeZone?, now? }` (the server
   * adds the label vocabulary).
   */
  async getLlmPayload(
    body: LlmPayloadRequest,
    token: FirebaseIdToken,
    options?: { timeout?: number }
  ): Promise<BaseResponse<LlmPayloadResponse>> {
    const url = buildUrl(this.baseUrl, '/api/v1/llm/payload');
    const response = await this.networkClient.post(url, body, {
      headers: createAuthHeaders(token),
      timeout: options?.timeout ?? 30_000,
    });
    return validateResponse<LlmPayloadResponse>(response.data, 'getLlmPayload');
  }

  /** The sites for an intent's labels (`POST /candidates`), unranked (local mode ranks them with `rank-sites`). */
  async getCandidates(
    labels: string[],
    token: FirebaseIdToken,
    options?: { timeout?: number }
  ): Promise<BaseResponse<CandidateSite[]>> {
    const url = buildUrl(this.baseUrl, '/api/v1/candidates');
    const response = await this.networkClient.post(
      url,
      { labels },
      { headers: createAuthHeaders(token), timeout: options?.timeout }
    );
    return validateResponse<CandidateSite[]>(response.data, 'getCandidates');
  }

  /** A site's MCP manifest (`GET /sites/:apiHost/manifest`), for direct calls. */
  async getSiteManifest(
    apiHost: string,
    token: FirebaseIdToken,
    options?: { timeout?: number }
  ): Promise<BaseResponse<McpManifest>> {
    const url = buildUrl(
      this.baseUrl,
      `/api/v1/sites/${encodeURIComponent(apiHost)}/manifest`
    );
    const response = await this.networkClient.get(url, {
      headers: createAuthHeaders(token),
      timeout: options?.timeout,
    });
    return validateResponse<McpManifest>(response.data, 'getSiteManifest');
  }

  /** A site's largest raster icon (`GET /sites/:apiHost/icon`). */
  async getSiteIcon(
    apiHost: string,
    token: FirebaseIdToken,
    options?: { timeout?: number }
  ): Promise<BaseResponse<SiteIconResponse>> {
    const url = buildUrl(
      this.baseUrl,
      `/api/v1/sites/${encodeURIComponent(apiHost)}/icon`
    );
    const response = await this.networkClient.get(url, {
      headers: createAuthHeaders(token),
      timeout: options?.timeout,
    });
    return validateResponse<SiteIconResponse>(response.data, 'getSiteIcon');
  }

  /**
   * Sites whose domain contains `query` and that have a sign-in
   * (`GET /sites/search?q=`), for adding a credential.
   */
  async searchSites(
    query: string,
    token: FirebaseIdToken,
    options?: { timeout?: number }
  ): Promise<BaseResponse<SiteSearchHit[]>> {
    const url = buildUrl(
      this.baseUrl,
      `/api/v1/sites/search?q=${encodeURIComponent(query)}`
    );
    const response = await this.networkClient.get(url, {
      headers: createAuthHeaders(token),
      timeout: options?.timeout,
    });
    return validateResponse<SiteSearchHit[]>(response.data, 'searchSites');
  }

  /** Store a finished local run for History (`POST /runs/import`). */
  async importRun(
    run: RunImportRequest,
    token: FirebaseIdToken,
    options?: { timeout?: number }
  ): Promise<BaseResponse<RunImportResponse>> {
    const url = buildUrl(this.baseUrl, '/api/v1/runs/import');
    const response = await this.networkClient.post(url, run, {
      headers: createAuthHeaders(token),
      timeout: options?.timeout ?? 30_000,
    });
    return validateResponse<RunImportResponse>(response.data, 'importRun');
  }

  /**
   * The streaming run endpoint. Not called through `NetworkClient`: the app's
   * AI SDK chat transport posts to it and reads the UI message stream.
   */
  runsUrl(): string {
    return buildUrl(this.baseUrl, '/api/v1/runs');
  }
}
