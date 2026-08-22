import { joinRouteFor } from '../join/pendingJoin';
import { SIGNED_IN_HOME, WELCOME_ROUTE, isJoinRoute, isPublicRoute } from '../navigation/authRoutes';
import type { MeResponse } from '../types/api';


export const VERIFY_CODE_ROUTE = '/verify-code';
export const VERIFY_CODE_SEGMENT = 'verify-code';
export const ONBOARDING_SEGMENT = 'onboarding';

export const ONBOARDING_ROUTES = {
  profile: '/onboarding/profile',
  goals: '/onboarding/goals',
  interests: '/onboarding/interests',
  travelSetup: '/onboarding/travel-setup',
  complete: '/onboarding/complete',
} as const;


export const STEP_COUNT = 4;

export const STEP_NUMBERS = {
  profile: 1,
  goals: 2,
  interests: 3,
  travelSetup: 4,
} as const;


export type OnboardingProfile = Pick<
  MeResponse,
  'handle' | 'interests' | 'country' | 'onboardingCompleted'
>;


export function nextOnboardingStep(profile: OnboardingProfile): string | null {
  if (profile.onboardingCompleted) return null;
  if (profile.handle === null) return ONBOARDING_ROUTES.profile;
  if (profile.interests.length === 0) return ONBOARDING_ROUTES.interests;
  if (profile.country === null) return ONBOARDING_ROUTES.travelSetup;
  return ONBOARDING_ROUTES.complete;
}


export interface GateInput {
  readonly auth: 'restoring' | 'signedOut' | 'signedIn';
  readonly emailVerified: boolean;
  readonly profile: OnboardingProfile | null;

  readonly profileUnreadable: boolean;
  readonly segment: string | undefined;

  readonly pendingJoinToken?: string | null;
  readonly pendingJoinSettled?: boolean;
}


export function landingAfterSignIn(token: string | null | undefined): string {
  return token === null || token === undefined ? SIGNED_IN_HOME : joinRouteFor(token);
}


export function destinationFor(input: GateInput): string | null {
  const { auth, emailVerified, profile, profileUnreadable, segment } = input;

  if (auth === 'restoring') return null;

  if (isJoinRoute(segment)) return null;

  if (auth === 'signedOut') return isPublicRoute(segment) ? null : WELCOME_ROUTE;

  if (!emailVerified) return segment === VERIFY_CODE_SEGMENT ? null : VERIFY_CODE_ROUTE;

  if (profile === null) {
    if (!profileUnreadable) return null;
    return isPublicRoute(segment) || segment === VERIFY_CODE_SEGMENT ? settledHomeOf(input) : null;
  }

  const step = nextOnboardingStep(profile);

  if (step === null) {
    return isPublicRoute(segment) || segment === VERIFY_CODE_SEGMENT ? settledHomeOf(input) : null;
  }

  return segment === ONBOARDING_SEGMENT ? null : step;
}


function pendingJoinIsKnown(input: GateInput): boolean {
  return input.pendingJoinSettled !== false;
}


function settledHomeOf(input: GateInput): string | null {
  if (!pendingJoinIsKnown(input)) return null;
  return landingAfterSignIn(input.pendingJoinToken);
}


export function isSettling(input: GateInput): boolean {
  const { auth, emailVerified, profile, profileUnreadable, segment } = input;

  if (auth === 'restoring') return true;
  if (isJoinRoute(segment)) return false;
  if (auth === 'signedOut') return !isPublicRoute(segment);
  if (!emailVerified) return segment !== VERIFY_CODE_SEGMENT;

  if (!isPublicRoute(segment) && segment !== VERIFY_CODE_SEGMENT) return false;

  if (profile === null) return !profileUnreadable || !pendingJoinIsKnown(input);

  return nextOnboardingStep(profile) === null && !pendingJoinIsKnown(input);
}
