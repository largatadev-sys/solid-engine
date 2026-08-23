import { track } from '../analytics/track';

export const ONBOARDING_SKIPPED = 'onboarding_skipped';


export function trackOnboardingSkipped(step: number): void {
  track(ONBOARDING_SKIPPED, { step });
}
