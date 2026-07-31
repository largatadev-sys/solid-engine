import type { DayResponse } from '../types/api';


export function dayHeading(day: Pick<DayResponse, 'ordinal' | 'title'>): string {
  return day.title !== null && day.title !== '' ? `Day ${day.ordinal}: ${day.title}` : `Day ${day.ordinal}`;
}
