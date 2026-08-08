import type { ItineraryResponse, Visibility } from '../types/api';


const BADGES: Record<Visibility, string> = {
  public: 'Published',
  private: 'Private',
};


const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;


export function publicationBadge(
  itinerary: Pick<ItineraryResponse, 'published' | 'visibility'>,
): string | null {
  return itinerary.published ? BADGES[itinerary.visibility] : null;
}


export function tripCardDate(
  itinerary: Pick<ItineraryResponse, 'startDate' | 'endDate'>,
): string | null {
  const day = itinerary.startDate ?? itinerary.endDate;
  if (day === null) return null;

  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(day);
  if (match === null) return null;

  const month = MONTHS[Number(match[2]) - 1];
  return month === undefined ? null : `${month} ${match[1]}`;
}
