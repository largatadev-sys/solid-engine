import type { ItineraryResponse } from '../types/api';




export type LifecycleBanner = {

  act: 'start' | 'complete';

  overdue: boolean;
};


export function lifecycleBanner(
  itinerary: Pick<ItineraryResponse, 'state' | 'startDate' | 'endDate'>,
  isOwner: boolean,
  today: string,
): LifecycleBanner | null {
  if (!isOwner) return null;

  switch (itinerary.state) {
    case 'draft':
      return { act: 'start', overdue: hasPassed(itinerary.startDate, today) };
    case 'active':
      return { act: 'complete', overdue: hasPassed(itinerary.endDate, today) };
    default:
      return null;
  }
}


function hasPassed(date: string | null, today: string): boolean {
  return date !== null && date < today;
}


export function deviceToday(now: Date = new Date()): string {
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
