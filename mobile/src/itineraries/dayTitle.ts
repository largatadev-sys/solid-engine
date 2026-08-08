import type { DayResponse } from '../types/api';


export function dayPrefix(day: Pick<DayResponse, 'ordinal'>): string {
  return `Day ${day.ordinal}`;
}


export function dayName(day: Pick<DayResponse, 'title'>): string {
  return day.title ?? '';
}


export function dayTitleLine(day: Pick<DayResponse, 'ordinal' | 'title'>): string {
  const name = dayName(day).trim();
  return name === '' ? dayPrefix(day) : `${dayPrefix(day)}: ${name}`;
}
