import type { ItineraryResponse } from '../types/api';

/**
 * Renders a trip's dates for display.
 *
 * Lives here rather than in a screen because two screens need it — and a screen importing another
 * screen's export makes the route file a de-facto utility module, which is how `app/` stops being
 * routes and starts being a library.
 *
 * Every combination is legitimate: dates are optional and independently settable (S0.3 spec), so
 * this exists mainly to guarantee none of them ever renders as "undefined".
 */
export function formatDates(itinerary: Pick<ItineraryResponse, 'startDate' | 'endDate'>): string {
  const { startDate, endDate } = itinerary;
  if (startDate !== undefined && endDate !== undefined) return `${startDate} → ${endDate}`;
  if (startDate !== undefined) return `From ${startDate}`;
  if (endDate !== undefined) return `Until ${endDate}`;
  return 'Dates to be decided';
}
