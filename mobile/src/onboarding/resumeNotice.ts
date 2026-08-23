import { ONBOARDING_ROUTES, ONBOARDING_SEGMENT } from './onboardingGate';

let resuming = false;


export function noteOnboardingEntry(destination: string): void {
  if (!destination.startsWith(`/${ONBOARDING_SEGMENT}/`)) return;

  resuming = destination !== ONBOARDING_ROUTES.profile;
}


export function enteredMidFlow(): boolean {
  return resuming;
}


export function forgetOnboardingEntry(): void {
  resuming = false;
}
