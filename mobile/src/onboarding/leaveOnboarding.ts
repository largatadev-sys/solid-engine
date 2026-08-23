import { forgetPendingJoin, pendingJoinToken } from '../join/pendingJoinStore';
import { forgetOnboardingEntry } from './resumeNotice';
import { landingAfterSignIn } from './onboardingGate';

export const SKIP_LABEL = 'Skip for now';

export const RESUME_LINE = 'Picking up where you left off';


export function landingOnTheWayOut(): string {
  const waiting = pendingJoinToken();
  forgetOnboardingEntry();
  forgetPendingJoin();

  return landingAfterSignIn(waiting);
}
