import type { PickedPhoto } from '../media/pickedPhoto';


export type DayDraft = {
  readonly date: string;
  readonly place: string;
  readonly caption: string;
  readonly photos: readonly PickedPhoto[];
  readonly savedDayId: string | null;
};


export function draftsFor(candidateDates: readonly string[]): DayDraft[] {
  return candidateDates.map((date) => ({
    date,
    place: '',
    caption: '',
    photos: [],
    savedDayId: null,
  }));
}


export function isWorthSaving(draft: DayDraft): boolean {
  return draft.photos.length > 0;
}


export function isUnsaved(draft: DayDraft): boolean {
  return draft.savedDayId === null && isWorthSaving(draft);
}


export function unsavedAmong(drafts: readonly DayDraft[]): DayDraft[] {
  return drafts.filter(isUnsaved);
}


export function withPhotos(
  draft: DayDraft,
  picked: readonly PickedPhoto[],
  limit: number,
): DayDraft {
  return { ...draft, photos: [...draft.photos, ...picked].slice(0, limit) };
}


export function withoutPhotoAt(draft: DayDraft, index: number): DayDraft {
  return { ...draft, photos: draft.photos.filter((_, at) => at !== index) };
}


export function replacedAt(
  drafts: readonly DayDraft[],
  index: number,
  next: DayDraft,
): DayDraft[] {
  return drafts.map((draft, at) => (at === index ? next : draft));
}


export function hasAnythingFilled(drafts: readonly DayDraft[]): boolean {
  return drafts.some(
    (draft) => draft.photos.length > 0 || draft.place.trim() !== '' || draft.caption.trim() !== '',
  );
}
