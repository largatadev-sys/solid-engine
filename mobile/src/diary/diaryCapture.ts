import type { DiaryEntryResponse, ItineraryState } from '../types/api';

export const MAX_DIARY_PHOTOS = 5;

export const DIARY_PRIVACY_NOTE = 'Only you can see your diary. It shows up on your profile.';


export function capturesAreOpen(state: ItineraryState): boolean {
  return state === 'ongoing' || state === 'completed';
}


export function entryForActivity(
  entries: readonly DiaryEntryResponse[],
  activityId: string,
): DiaryEntryResponse | null {
  return entries.find((entry) => entry.activityId === activityId) ?? null;
}


export function captureLabel(entry: DiaryEntryResponse | null): string {
  return entry === null ? 'Add to Diary' : 'Added ✓';
}


export function roomLeft(photoCount: number): number {
  return Math.max(0, MAX_DIARY_PHOTOS - photoCount);
}


export function canSubmit(photoCount: number): boolean {
  return photoCount >= 1 && photoCount <= MAX_DIARY_PHOTOS;
}


export function canRemovePhoto(photoCount: number): boolean {
  return photoCount > 1;
}


export function successMessage(activityTitle: string): string {
  return `${activityTitle} is now part of your Diary.`;
}
