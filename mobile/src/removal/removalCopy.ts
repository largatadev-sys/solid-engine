export const UNTITLED_TRIP = 'Untitled trip';

export const EDIT_POSTCARD_LABEL = 'Edit postcard';
export const DELETE_POSTCARD_LABEL = 'Delete postcard';

export const EDIT_DIARY_DETAILS_LABEL = 'Edit diary details';
export const COPY_PUBLIC_LINK_LABEL = 'Copy public link';

export const EDIT_ITINERARY_DETAILS_LABEL = 'Edit details';
export const VIEW_PUBLISHED_PAGE_LABEL = 'View published page';
export const UNPUBLISH_LABEL = 'Unpublish';

export const DELETE_TRIP_LABEL = 'Delete';
export const LEAVE_TRIP_LABEL = 'Leave';

export const UNDO_LABEL = 'Undo';
export const REPUBLISH_LABEL = 'Republish';

export const POSTCARD_DELETED_TOAST = 'Postcard deleted';
export const POSTCARD_RESTORED_TOAST = 'Postcard restored';
export const ITINERARY_UNPUBLISHED_TOAST = 'Itinerary unpublished';
export const ITINERARY_REPUBLISHED_TOAST = 'Itinerary republished';
export const LEFT_TRIP_TOAST = 'Left the trip';
export const BACK_IN_TRIP_TOAST = 'You are back in the trip';
export const TRIP_DELETED_TOAST = 'Trip deleted';

export const REMOVAL_FAILED_TOAST = 'That did not go through — nothing was changed';

export const OPENING_EDITOR_TOAST = 'Opening editor';
export const LINK_COPIED_TOAST = 'Link copied';
export const OPENING_PUBLISHED_PAGE_TOAST = 'Opening published page';
export const COMING_SOON_TOAST = 'Coming soon';

export const DELETE_TRIP_CANCEL_LABEL = 'Cancel';
export const DELETE_TRIP_CTA_LABEL = 'Delete trip';
export const DELETE_TRIP_SCRIM_LABEL = 'Cancel deleting this trip';

export const DELETE_TRIP_BODY =
  'This removes the trip for everyone — the plan, the chat, the photo dump, and every '
  + "member's postcards leave Largata immediately.";


export function deleteTripTitle(tripTitle: string): string {
  return `Delete ${tripTitle}?`;
}


export function deleteTripAcknowledgement(memberCount: number): string {
  const others = Math.max(0, memberCount - 1);
  if (others === 1) {
    return 'I understand this removes the trip for 1 other member.';
  }
  return `I understand this removes the trip for ${others} other members.`;
}


export function postcardMenuLabel(activityTitle: string): string {
  return `More options for ${activityTitle}`;
}


export function diaryMenuLabel(tripTitle: string): string {
  return `More options for ${tripTitle}`;
}


export function itineraryMenuLabel(title: string): string {
  return `More options for ${title}`;
}


export function swipeActionLabel(action: 'delete' | 'leave', tripTitle: string): string {
  return action === 'delete' ? `Delete ${tripTitle}` : `Leave ${tripTitle}`;
}
