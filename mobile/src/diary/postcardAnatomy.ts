import { twelveHour } from '../itineraries/clockTime';
import type { DiaryEntryResponse } from '../types/api';


export function postcardClock(twentyFourHourTime: string): string | null {
  const padded = twelveHour(twentyFourHourTime);
  return padded === null ? null : padded.replace(/^0/, '');
}


export function snapshotEyebrow(
  entry: Pick<DiaryEntryResponse, 'dayLabel' | 'timeOfDay'>,
): string {
  const at = entry.timeOfDay === null ? null : postcardClock(entry.timeOfDay);
  return at === null ? entry.dayLabel : `${entry.dayLabel} • ${at}`;
}


export function tripEntryCountLabel(entryCount: number): string {
  return entryCount === 1 ? '1 entry' : `${entryCount} entries`;
}


export function inTripDayOrder(
  entries: readonly DiaryEntryResponse[],
): DiaryEntryResponse[] {
  return [...entries].sort((a, b) => {
    const byDay = dayOrdinalOf(a.dayLabel) - dayOrdinalOf(b.dayLabel);
    if (byDay !== 0) return byDay;

    const byTime = (a.timeOfDay ?? '').localeCompare(b.timeOfDay ?? '');
    if (byTime !== 0) return byTime;

    return a.id.localeCompare(b.id);
  });
}


function dayOrdinalOf(dayLabel: string): number {
  const match = /^Day (\d+)/.exec(dayLabel);
  return match === null ? Number.MAX_SAFE_INTEGER : Number(match[1]);
}
