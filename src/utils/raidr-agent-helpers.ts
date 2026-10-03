import type { FirebaseIdToken } from '../types';

/**
 * Creates HTTP headers for authenticated API requests.
 *
 * Includes `Content-Type`, `Accept`, and `Authorization` headers.
 * The token is sent as a Bearer token in the `Authorization` header.
 *
 * @param token - A valid Firebase ID token for authentication
 * @returns A headers object suitable for use with {@link NetworkClient} requests
 *
 * @example
 * ```typescript
 * const headers = createAuthHeaders(idToken);
 * // { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ...' }
 * ```
 */
export function createAuthHeaders(
  token: FirebaseIdToken
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Creates HTTP headers for unauthenticated API requests.
 *
 * Includes only `Content-Type` and `Accept` headers. Used for public
 * endpoints that do not require authentication (e.g., histories total).
 *
 * @returns A headers object suitable for use with {@link NetworkClient} requests
 *
 * @example
 * ```typescript
 * const headers = createHeaders();
 * // { 'Content-Type': 'application/json', Accept: 'application/json' }
 * ```
 */
export function createHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

/**
 * Constructs a full API URL from a base URL and a path.
 *
 * Strips any trailing slash from the base URL to prevent double-slash issues,
 * then concatenates the path directly.
 *
 * @param baseUrl - The API base URL (e.g., `"https://api.example.com"` or `"https://api.example.com/"`)
 * @param path - The API path to append (must start with `/`, e.g., `"/api/v1/histories/total"`)
 * @returns The fully constructed URL
 *
 * @example
 * ```typescript
 * buildUrl('https://api.example.com/', '/api/v1/users/123');
 * // => 'https://api.example.com/api/v1/users/123'
 * ```
 */
export function buildUrl(baseUrl: string, path: string): string {
  const cleanBase = baseUrl.replace(/\/$/, '');
  return `${cleanBase}${path}`;
}

/**
 * Extracts a meaningful error message from an API error response.
 *
 * Inspects the response object for common error fields (`error`, `message`)
 * and constructs a descriptive `Error` with context about the failed operation.
 *
 * @param response - The raw error response from the API (typically the `data` property of a {@link NetworkResponse})
 * @param operation - A description of the operation that failed (e.g., `"fetch histories"`, `"create history"`)
 * @returns An `Error` with a message in the format `"Failed to <operation>: <errorMessage>"`
 *
 * @example
 * ```typescript
 * const error = handleApiError(response, 'fetch histories');
 * // Error: "Failed to fetch histories: User not found"
 * ```
 */
export function handleApiError(response: unknown, operation: string): Error {
  const resp = response as { data?: { error?: string; message?: string } };
  const errorMessage =
    resp?.data?.error || resp?.data?.message || 'Unknown error';
  return new Error(`Failed to ${operation}: ${errorMessage}`);
}
