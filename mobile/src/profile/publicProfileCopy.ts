export const PUBLIC_PROFILE_TITLE = 'Profile';

export const PUBLIC_PROFILE_BACK_LABEL = 'Back';

export const FOLLOW_LABEL = 'Follow';

export const POSTCARDS_STAT_LABEL = 'Postcards';

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


export const PROFILE_UNAVAILABLE_BODY =
  'It may have been removed, or the handle may have changed.';
