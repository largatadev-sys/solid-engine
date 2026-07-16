import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/ApiError';

/**
 * The local store ADR-001 requires: "all reads through a local store the network populates".
 *
 * S0.3 makes that structure real rather than nominal. A pass-through repository would satisfy the
 * letter of "no raw fetch in UI" while leaving no store at all — and, worse, would leak network
 * semantics into every screen (loading means latency, error means offline). That coupling, spread
 * across fifty screens, is the actual cost of retrofitting offline later; the store is what keeps
 * screens ignorant of where data came from.
 *
 * IN MEMORY ONLY, deliberately. Kill the app and the cache is gone. Offline-from-cold-start is E3's
 * story ("the offline read-cache proves itself here"), and it arrives as a persister on this same
 * client — an addition, not a rebuild. That is the b→c path ADR-001 declared.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale-while-revalidate: a warm cache renders instantly, then refreshes in the background.
        // 30s is a guess, and an honest one — nothing has measured it. It is short enough that a
        // traveler switching screens sees current data and long enough that they are not paying for
        // a round trip per navigation.
        staleTime: 30_000,
        retry: (failureCount, error) => {
          // Never retry what will not change: a 401 needs a new token, a 404 means the thing is not
          // there, a 400 means we asked wrong. Retrying those burns a traveler's battery and data to
          // arrive at the same answer. Retry the network itself once — a dead zone (ADR-001) is the
          // one failure that genuinely resolves itself.
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
          return failureCount < 1;
        },
      },
    },
  });
}
