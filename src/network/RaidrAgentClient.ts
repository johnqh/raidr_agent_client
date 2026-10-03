import type { NetworkClient } from '@sudobility/types';
import type {
  BaseResponse,
  HealthCheckData,
  IntentResponse,
  RunDetail,
  RunSummary,
  SiteAuthInfo,
  User,
} from '@sudobility/raidr_agent_types';
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

  /** Classify a request and list the sites that can answer it. */
  async classifyIntent(
    request: string,
    token: FirebaseIdToken,
    options?: { timeout?: number }
  ): Promise<BaseResponse<IntentResponse>> {
    const url = buildUrl(this.baseUrl, '/api/v1/intent');
    const response = await this.networkClient.post(
      url,
      { request },
      { headers: createAuthHeaders(token), timeout: options?.timeout ?? 60_000 }
    );
    return validateResponse<IntentResponse>(response.data, 'classifyIntent');
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

  /**
   * The streaming run endpoint. Not called through `NetworkClient`: the app's
   * AI SDK chat transport posts to it and reads the UI message stream.
   */
  runsUrl(): string {
    return buildUrl(this.baseUrl, '/api/v1/runs');
  }
}
