import type { ItineraryResponse } from '../types/api';

/**
 * Renders a trip's dates for display.
 *
 * Lives here rather than in a screen because two screens need it — and a screen importing another
 * screen's export makes the route file a de-facto utility module, which is how `app/` stops being
 * routes and starts being a library.
 *
 * Every combination is legitimate: dates are optional and independently settable (S0.3 spec), so
 * this exists mainly to guarantee none of them ever renders as "null" or "undefined".
 *
 * **The nullish check (`== null`) is deliberate and load-bearing.** The server sends
 * `"startDate": null`, not an absent key — so the original `!== undefined` test passed for a null
 * and rendered a literal "null → null" on the device, with all thirteen unit tests green (they
 * built objects where absent meant `undefined`; the wire disagreed). `== null` catches both, which
 * is the one case this function exists to catch.
 */
export function formatDates(itinerary: Pick<ItineraryResponse, 'startDate' | 'endDate'>): string {
  const start = itinerary.startDate;
  const end = itinerary.endDate;

  if (start != null && end != null) return `${start} → ${end}`;
  if (start != null) return `From ${start}`;
  if (end != null) return `Until ${end}`;
  return 'Dates to be decided';
}
