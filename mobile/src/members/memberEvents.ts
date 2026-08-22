import { track } from '../analytics/track';

export const LINK_SHARED = 'invite_link_shared';

export const JOIN_LANDING_VIEWED = 'join_landing_viewed';


export function trackLinkShared(itineraryId: string): void {
  track(LINK_SHARED, { itineraryId });
}


export function trackJoinLandingViewed(viewerState: string, signedIn: boolean): void {
  track(JOIN_LANDING_VIEWED, { viewerState, signedIn });
}
