export type DateRange = {
  start: string | null;
  end: string | null;
};


export type RangeMode = 'range' | 'single';


export const emptyRange: DateRange = { start: null, end: null };


export function tapped(range: DateRange, day: string, mode: RangeMode = 'range'): DateRange {
  if (mode === 'single') return { start: day, end: day };

  if (range.start === null || range.end !== null) return { start: day, end: null };
  if (day <= range.start) return { start: day, end: null };

  return { start: range.start, end: day };
}


export function isComplete(range: DateRange): boolean {
  return range.start !== null && range.end !== null;
}


export function dayCountOf(range: DateRange): number {
  if (range.start === null) return 0;
  if (range.end === null) return 1;

  return Math.round(
    (Date.parse(`${range.end}T00:00:00Z`) - Date.parse(`${range.start}T00:00:00Z`)) / 86_400_000,
  ) + 1;
}


export function isWithin(range: DateRange, day: string): boolean {
  if (range.start === null || range.end === null) return false;
  return day >= range.start && day <= range.end;
}


export function isEdgeOf(range: DateRange, day: string): boolean {
  return day === range.start || day === range.end;
}


export function isOutsideBounds(day: string, bounds: DateRange | undefined): boolean {
  if (bounds === undefined || bounds.start === null || bounds.end === null) return false;

  return day < bounds.start || day > bounds.end;
}


export function isInTheFuture(day: string, today: string): boolean {
  return day > today;
}


export function monthGridOf(year: number, monthIndex: number): (string | null)[] {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  const grid: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    grid.push(isoOf(year, monthIndex, day));
  }
  return grid;
}


export function isoOf(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}


export function todayIso(now: Date = new Date()): string {
  return isoOf(now.getFullYear(), now.getMonth(), now.getDate());
}
