export const PUBLIC_PROFILE_TITLE = 'Profile';

export const PUBLIC_PROFILE_BACK_LABEL = 'Back';

export const FOLLOW_LABEL = 'Follow';

export const FOLLOWING_LABEL = 'Following';

export const DESTINATIONS_STAT_LABEL = 'Destinations';

export const AWAITING_COUNT = '—';

export const PROFILE_UNAVAILABLE = "This profile isn't available";

export const PUBLIC_DIARY_EMPTY_TITLE = 'Nothing published yet';

export const PUBLIC_ITINERARIES_EMPTY_TITLE = 'Nothing published yet';

export const PEOPLE_GROUP_LABEL = 'People';

export const SEE_ALL_PEOPLE_LABEL = 'See all people';

export const PEOPLE_RESULTS_BACK_LABEL = 'Back to search';

export const PEOPLE_NO_RESULTS_SUPPORT =
  'Check the spelling, or try a display name instead of a handle.';


export function publicDiaryEmptyBody(displayName: string | null): string {
  return `When ${firstNameOf(displayName)} publishes postcards from their trips, they'll show up here.`;
}


export function publicItinerariesEmptyBody(displayName: string | null): string {
  return `When ${firstNameOf(displayName)} publishes itineraries, they'll show up here.`;
}


export function peopleCountLabel(count: number): string {
  return count === 1 ? '1 person' : `${count} people`;
}


export const FOLLOWERS_TITLE = 'Followers';

export const FOLLOWING_TITLE = 'Following';

export const FOLLOWERS_EMPTY_TITLE = 'No followers yet';

export const FOLLOWERS_EMPTY_BODY = "When travelers follow you, they'll show up here.";

export const FOLLOWING_EMPTY_TITLE = 'Not following anyone yet';

export const FOLLOWING_EMPTY_BODY =
  'Follow travelers to see their postcards in your Home feed.';

export const FIND_PEOPLE_LABEL = 'Find people';

export const FOLLOW_LIST_RETRY_LABEL = 'Could not load. Tap to retry.';


export function followersCountLabel(count: number): string {
  return count === 1 ? '1 follower' : `${count} followers`;
}


export function followingCountLabel(count: number): string {
  return `${count} following`;
}


export function followFailedToast(handle: string | null): string {
  return handle === null ? "Couldn't follow that traveler" : `Couldn't follow @${handle}`;
}


export function unfollowFailedToast(handle: string | null): string {
  return handle === null ? "Couldn't unfollow that traveler" : `Couldn't unfollow @${handle}`;
}


export function noPeopleMatchTitle(query: string): string {
  return `No one matches "${query}"`;
}


export function firstNameOf(displayName: string | null): string {
  const named = (displayName ?? '').trim();
  if (named === '') {
    return 'this traveler';
  }
  return named.split(/\s+/)[0] ?? named;
}


export function publicDiaryFailed(displayName: string | null): string {
  return `Could not load ${firstNameOf(displayName)}'s diary — tap to retry`;
}


export const PROFILE_UNAVAILABLE_BODY =
  'It may have been removed, or the handle may have changed.';


export const SHOW_MORE_LABEL = 'Show more';

export const UNTITLED_TRIP = 'Untitled trip';
