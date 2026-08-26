import { track } from '../analytics/track';

export const PUBLIC_PROFILE_VIEWED = 'public_profile_viewed';


export function trackPublicProfileViewed(subjectId: string, from: string): void {
  track(PUBLIC_PROFILE_VIEWED, { subjectId, from });
}
