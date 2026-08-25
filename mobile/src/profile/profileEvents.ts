import { track } from '../analytics/track';

export const PUBLIC_PROFILE_VIEWED = 'public_profile_viewed';

export const PEOPLE_RESULT_TAPPED = 'people_result_tapped';

export const FOLLOW_TAPPED = 'follow_tapped';


export function trackPublicProfileViewed(subjectId: string, from: string): void {
  track(PUBLIC_PROFILE_VIEWED, { subjectId, from });
}


export function trackPeopleResultTapped(subjectId: string, surface: string): void {
  track(PEOPLE_RESULT_TAPPED, { subjectId, surface });
}


export function trackFollowTapped(subjectId: string): void {
  track(FOLLOW_TAPPED, { subjectId });
}
