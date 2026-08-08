import type { DayResponse } from '../types/api';
import { dayTitleLine } from './dayTitle';


export function dayHeading(day: Pick<DayResponse, 'ordinal' | 'title'>): string {
  return dayTitleLine(day);
}
