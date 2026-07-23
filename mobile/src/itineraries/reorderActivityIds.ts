/**
 * Compute a day's new activity order after nudging one activity up or down (S1.3, ticket 03).
 *
 * A pure function, extracted from the screen so the reorder logic — the one bit worth getting right —
 * is testable without a renderer (the `formatActivityCost` / query-options pattern). The screen sends
 * the returned whole list to the reorder endpoint (manual order is authoritative, ADR-013).
 *
 * Ticket 03 ships move-up/move-down controls rather than a drag gesture: a true drag needs a native
 * gesture library (a config-plugin-scale dependency decision the ticket has no mandate to make), and
 * up/down delivers the AC — order persists, survives refresh, time never resorts — with logic that is
 * a pure array swap. A drag gesture is an additive polish later (noted in the ticket).
 *
 * @param ids the day's activity ids in current order
 * @param index the position of the activity being moved
 * @param direction which way to nudge it
 * @returns the new order, or the same array (a new copy) when the move would fall off either end
 */
export function reorderActivityIds(ids: string[], index: number, direction: 'up' | 'down'): string[] {
  const target = direction === 'up' ? index - 1 : index + 1;
  // Off the end, or an out-of-range index: nothing moves. Return a copy so callers can treat the
  // result uniformly (a mutation of the input would surprise a caller that still holds it).
  if (index < 0 || index >= ids.length || target < 0 || target >= ids.length) {
    return [...ids];
  }
  const next = [...ids];
  const moved = next[index];
  const displaced = next[target];
  // Both are in-bounds by the guard above; the assertion satisfies noUncheckedIndexedAccess without a
  // runtime check the guard already made.
  next[index] = displaced as string;
  next[target] = moved as string;
  return next;
}
