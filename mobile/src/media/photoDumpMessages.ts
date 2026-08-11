export const PHOTO_DUMP_EMPTY_TITLE = 'No photos yet';

export const PHOTO_DUMP_EMPTY_BODY =
  'Photos anyone on this trip adds land here, for everyone on the trip to see.';

export const PHOTO_DUMP_ADD_LABEL = 'Add Photos';

export const PHOTO_DUMP_LOAD_FAILURE = 'Could not load this trip’s photos.';

export const PHOTO_DUMP_ARCHIVED_NOTE = 'This trip is archived, so its photo pool is read-only.';

export const PHOTO_DUMP_PHOTO_ADDED = 'photo_dump_photo_added';

export const PHOTO_DUMP_PHOTO_REMOVED = 'photo_dump_photo_removed';


export function photoDumpDeleteWording(mine: boolean) {
  return {
    title: 'Delete this photo?',
    body: mine
      ? 'It will be removed from the trip’s photos for everyone.'
      : 'As the trip owner you can remove any traveler’s photo. This cannot be undone.',
    confirmLabel: 'Delete',
  };
}
