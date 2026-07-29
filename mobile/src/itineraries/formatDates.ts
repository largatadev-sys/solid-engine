import type { ItineraryResponse } from '../types/api';


export function formatDates(itinerary: Pick<ItineraryResponse, 'startDate' | 'endDate'>): string {
  const start = itinerary.startDate;
  const end = itinerary.endDate;

  if (start != null && end != null) return `${start} → ${end}`;
  if (start != null) return `From ${start}`;
  if (end != null) return `Until ${end}`;
  return 'Dates to be decided';
}
