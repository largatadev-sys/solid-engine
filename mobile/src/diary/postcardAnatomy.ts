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


export function composerEyebrow(dayLabel: string, timeOfDay: string | null): string {
  return snapshotEyebrow({ dayLabel, timeOfDay });
}


export function tripEntryCountLabel(entryCount: number): string {
  return entryCount === 1 ? '1 entry' : `${entryCount} entries`;
}
