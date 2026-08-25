import { track } from '../analytics/track';

export const PUBLIC_PROFILE_VIEWED = 'public_profile_viewed';

export const PEOPLE_RESULT_TAPPED = 'people_result_tapped';

export const FOLLOW_TAPPED = 'follow_tapped';


export function trackPublicProfileViewed(handle: string, from: string): void {
  track(PUBLIC_PROFILE_VIEWED, { handle, from });
}


export function trackPeopleResultTapped(handle: string, surface: string): void {
  track(PEOPLE_RESULT_TAPPED, { handle, surface });
}


export function trackFollowTapped(handle: string): void {
  track(FOLLOW_TAPPED, { handle });
}
