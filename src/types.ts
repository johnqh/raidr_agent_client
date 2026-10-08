/**
 * Branded type alias for Firebase ID tokens used to authenticate API requests.
 *
 * All protected endpoints require a valid Firebase ID token passed in the
 * `Authorization: Bearer <token>` header. Obtain this token from
 * `firebase.auth().currentUser.getIdToken()`.
 */
export type FirebaseIdToken = string;

/**
 * Default stale time for TanStack Query hooks (5 minutes).
 *
 * Cached data is considered fresh for this duration. Queries will not
 * refetch in the background while data is still fresh.
 */
export const DEFAULT_STALE_TIME = 5 * 60 * 1000;

/**
 * Default garbage collection time for TanStack Query hooks (30 minutes).
 *
 * Inactive cached data is kept in memory for this duration before being
 * garbage collected. This allows instant restoration when a component
 * remounts within the window.
 */
export const DEFAULT_GC_TIME = 30 * 60 * 1000;

/**
 * Type-safe cache key factory for TanStack Query.
 *
 * Provides structured, deterministic query keys used internally by all hooks
 * and available for consumers who need manual cache invalidation or prefetching.
 *
 * @example
 * ```typescript
 * import { QUERY_KEYS } from '@sudobility/raidr_agent_client';
 *
 * // Manual invalidation
 * queryClient.invalidateQueries({ queryKey: QUERY_KEYS.user(userId) });
 * ```
 */
export const QUERY_KEYS = {
  /** Cache key for the API health check. */
  health: () => ['raidr_agent', 'health'] as const,
  /** Cache key for a user profile. */
  user: (userId: string) => ['raidr_agent', 'user', userId] as const,
  /** Cache key for one site's sign-in details. */
  siteAuth: (apiHost: string) => ['raidr_agent', 'site-auth', apiHost] as const,
  /** Cache key for the run history. */
  runs: () => ['raidr_agent', 'runs'] as const,
  /** Cache key for one run. */
  run: (runId: string) => ['raidr_agent', 'run', runId] as const,
  /** Cache key for the candidate sites of a label list. */
  candidates: (labels: string[]) =>
    ['raidr_agent', 'candidates', labels.join(',')] as const,
  /** Cache key for one site's MCP manifest. */
  siteManifest: (apiHost: string) =>
    ['raidr_agent', 'site-manifest', apiHost] as const,
  /** Cache key for one site's icon URL. */
  siteIcon: (apiHost: string) => ['raidr_agent', 'site-icon', apiHost] as const,
  /** Cache key for one site's context (manifest, tool auth, routes). */
  siteContext: (apiHost: string) =>
    ['raidr_agent', 'site-context', apiHost] as const,
} as const;
