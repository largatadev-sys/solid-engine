import type { ItineraryResponse } from '../types/api';


export const DATES_TO_BE_DECIDED = 'Dates to be decided';


const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


export type TripFacts = Pick<ItineraryResponse, 'destination' | 'startDate' | 'endDate'>;


export function workspaceFactsLine(itinerary: TripFacts): string {
  return [itinerary.destination.trim(), tripDates(itinerary)]
    .filter((fact) => fact !== '')
    .join(' · ');
}


export function tripDates(itinerary: Pick<TripFacts, 'startDate' | 'endDate'>): string {
  const start = parse(itinerary.startDate);
  const end = parse(itinerary.endDate);

  if (start === null && end === null) return DATES_TO_BE_DECIDED;
  if (start !== null && end === null) return `From ${full(start)}`;
  if (start === null && end !== null) return `Until ${full(end)}`;

  const from = start as CalendarDate;
  const to = end as CalendarDate;

  if (from.year !== to.year) return `${full(from)} – ${full(to)}`;
  if (from.month !== to.month) return `${from.day} ${MONTHS[from.month]} – ${full(to)}`;
  if (from.day !== to.day) return `${from.day}–${to.day} ${MONTHS[to.month]} ${to.year}`;
  return full(to);
}


type CalendarDate = { year: number; month: number; day: number };


function parse(value: string | null): CalendarDate | null {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parts = value.split('-').map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 0;
  const day = parts[2] ?? 0;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month: month - 1, day };
}


function full(date: CalendarDate): string {
  return `${date.day} ${MONTHS[date.month]} ${date.year}`;
}
