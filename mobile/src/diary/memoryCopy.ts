export const POST_SHEET_TITLE = 'Post';

export const POST_SHEET_DIARY_TITLE = 'A Diary';

export const POST_SHEET_DIARY_BODY = 'Share your past travel memories';

export const POST_SHEET_POSTCARD_TITLE = 'A Postcard';

export const POST_SHEET_POSTCARD_BODY = 'Send a quick travel update';

export const NEW_DIARY_BADGE = 'DIARY';

export const NEW_DIARY_TITLE = 'New Diary';

export const NEW_DIARY_SUBTITLE = 'Tell a trip you already took. Days come next.';

export const DIARY_TITLE_LABEL = 'Title';

export const DIARY_TITLE_PLACEHOLDER = 'Lisbon & the Algarve';

export const DIARY_DESTINATION_LABEL = 'Destination';

export const DIARY_DESTINATION_PLACEHOLDER = 'Where did you go?';

export const DIARY_COVER_LABEL = 'Cover';

export const DIARY_COVER_EMPTY = 'Tap to add cover';

export const DIARY_WHEN_LABEL = 'When was this?';

export const DIARY_START_LABEL = 'Start';

export const DIARY_END_LABEL = 'End';

export const DIARY_END_PLACEHOLDER = 'End date';

export const DIARY_NEXT_CTA = 'Next: Add Your Days';

export const DIARY_CREATE_FAILED = "Couldn't create the diary. Try again.";

export const CALENDAR_DONE = 'Done';

export const DIARY_DAYS_SUBTITLE = 'Fill in the spots you remember from each day';

export const DAY_PLACE_LABEL = 'Where were you?';

export const DAY_PLACE_PLACEHOLDER = 'Add a place';

export const DAY_PHOTOS_LABEL = 'Photos';

export const DAY_ADD_PHOTO = 'Add photo';

export const DAY_CAPTION_LABEL = 'What happened?';

export const DIARY_DAYS_HINT = "You can skip days you don't remember.";

export const DIARY_POST_CTA = 'Post';

export const DIARY_POSTED_TOAST = 'Diary posted!';

export const NEW_POSTCARD_BADGE = 'POSTCARD';

export const NEW_POSTCARD_TITLE = 'New Postcard';

export const POSTCARD_CAPTION_LABEL = 'Caption';

export const POSTCARD_PLACE_LABEL = 'Where were you?';

export const POSTCARD_POST_CTA = 'Post';

export const POSTCARD_POSTED_TOAST = 'Postcard posted!';

export const POSTCARD_POST_FAILED = "Couldn't post. Your postcard is still here.";

export const DIARY_TAB_EMPTY_TITLE = 'Nothing posted yet';

export const DIARY_TAB_EMPTY_BODY =
  'Tell a past trip as a Diary, or send a Postcard from wherever you are.';

export const DIARIES_STAT_LABEL = 'Diaries';

export const ITINERARIES_STAT_LABEL = 'Itineraries';

export const VIEW_ITINERARY_LINK = 'View itinerary →';

export const NO_POSTCARDS_ON_THIS_DAY = 'No postcards on this day';

export const ADD_A_DAY_CTA = 'Add a day';

export const ADD_POSTCARD_CTA = '+ Postcard';

export const EDIT_DIARY_ACTION = 'Edit diary';

export const DELETE_DIARY_ACTION = 'Delete diary';

export const EDIT_POSTCARD_ACTION = 'Edit caption';

export const DELETE_POSTCARD_ACTION = 'Delete postcard';

export const DELETE_DAY_ACTION = 'Delete day';

export const ADD_TO_DIARY_ACTION = 'Add to diary';

export const CANCEL_ACTION = 'Cancel';

export const DELETE_ACTION = 'Delete';

export const KEEP_EDITING_ACTION = 'Keep editing';

export const DISCARD_ACTION = 'Discard';

export const DIARY_DELETED_TOAST = 'Diary deleted';

export const POSTCARD_DELETED_TOAST = 'Postcard deleted';

export const DELETE_FAILED_TOAST = "Couldn't delete. Try again.";

export const ADD_FAILED_LINE = "Couldn't add it. Try again.";

export const EDIT_DIARY_TITLE = 'Edit diary';

export const EDIT_DIARY_DATES_HINT = "Changing the dates won't add or remove days.";

export const SAVE_CTA = 'Save';

export const DISCARD_CHANGES_TITLE = 'Discard changes?';

export const DISCARD_DIARY_TITLE = 'Discard this diary?';

export const DISCARD_DIARY_BODY = 'Everything you filled in will be gone.';

export const ADD_A_DAY_TITLE = 'Add a day';

export const ADD_TO_DIARY_TITLE = 'Add to diary';

export const CHOOSE_A_DAY_TITLE = 'Choose a day';


export function deleteDiaryTitle(postcardCount: number): string {
  return `Delete this diary and its ${postcardCount} ${plural(postcardCount, 'postcard')}?`;
}


export function deleteDiaryBody(title: string): string {
  return `${title} and everything in it will be gone. This can't be undone.`;
}


export function deleteDayTitle(postcardCount: number): string {
  return `Delete this day and its ${postcardCount} ${plural(postcardCount, 'postcard')}?`;
}


export function deletePostcardTitle(): string {
  return 'Delete this postcard?';
}


export function deletePostcardBody(): string {
  return "The photos and caption will be gone. This can't be undone.";
}


export function addedToDiaryToast(title: string): string {
  return `Added to ${title}`;
}


export function photoCountLabel(picked: number, limit: number): string {
  return `${picked} of ${limit}`;
}


export function sectionMetaLine(destination: string | null, dayCount: number): string {
  const days = `${dayCount} ${plural(dayCount, 'day')}`;
  return destination === null || destination.trim() === '' ? days : `${destination} • ${days}`;
}


export function dayHeading(ordinal: number, date: string): string {
  return `Day ${ordinal}: ${shortDate(date)}`;
}


export function dayOrdinalLabel(ordinal: number): string {
  return `Day ${ordinal}`;
}


export function shortDate(iso: string): string {
  const { monthName, day, year } = partsOf(iso);
  return `${monthName} ${day}, ${year}`;
}


export function dayDateLabel(iso: string): string {
  const { monthName, day } = partsOf(iso);
  return `${monthName} ${day}`;
}


export function dateSpanLabel(startIso: string, endIso: string): string {
  const from = partsOf(startIso);
  const to = partsOf(endIso);

  if (from.year === to.year && from.monthName === to.monthName) {
    return `${from.monthName} ${from.day}–${to.day}, ${from.year}`;
  }
  if (from.year === to.year) {
    return `${from.monthName} ${from.day} – ${to.monthName} ${to.day}, ${from.year}`;
  }
  return `${shortDate(startIso)} – ${shortDate(endIso)}`;
}


function partsOf(iso: string): {
  readonly year: number;
  readonly monthName: string;
  readonly day: number;
} {
  const year = Number(iso.slice(0, 4));
  const monthIndex = Number(iso.slice(5, 7)) - 1;
  return { year, monthName: MONTHS[monthIndex] ?? '', day: Number(iso.slice(8, 10)) };
}


export function rangeSummary(dayCount: number): string {
  return `${dayCount} ${plural(dayCount, 'day')}`;
}


function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}


const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;
