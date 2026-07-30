import {
  ONBOARDING_ROUTES,
  VERIFY_CODE_ROUTE,
  destinationFor,
  isSettling,
  nextOnboardingStep,
  type GateInput,
  type OnboardingProfile,
} from '../src/onboarding/onboardingGate';
import { SIGNED_IN_HOME, WELCOME_ROUTE } from '../src/navigation/authRoutes';

const BLANK: OnboardingProfile = {
  handle: null,
  goals: [],
  interests: [],
  country: null,
  onboardingCompleted: false,
};

const DONE: OnboardingProfile = {
  handle: 'anasilva',
  goals: ['discover'],
  interests: ['food', 'hiking', 'art'],
  country: 'PH',
  onboardingCompleted: true,
};

function gate(overrides: Partial<GateInput>): GateInput {
  return {
    auth: 'signedIn',
    emailVerified: true,
    profile: DONE,
    profileUnreadable: false,
    segment: undefined,
    ...overrides,
  };
}

describe('which step the flow resumes at', () => {
  it('a brand new profile starts at the profile step', () => {
    expect(nextOnboardingStep(BLANK)).toBe(ONBOARDING_ROUTES.profile);
  });

  it('each answered step advances to the next one, in the counted order', () => {
    expect(nextOnboardingStep({ ...BLANK, handle: 'ana' })).toBe(ONBOARDING_ROUTES.goals);
    expect(nextOnboardingStep({ ...BLANK, handle: 'ana', goals: ['discover'] })).toBe(
      ONBOARDING_ROUTES.interests,
    );
    expect(
      nextOnboardingStep({ ...BLANK, handle: 'ana', goals: ['discover'], interests: ['food'] }),
    ).toBe(ONBOARDING_ROUTES.travelSetup);
    expect(
      nextOnboardingStep({
        ...BLANK,
        handle: 'ana',
        goals: ['discover'],
        interests: ['food'],
        country: 'PH',
      }),
    ).toBe(ONBOARDING_ROUTES.complete);
  });

  it('a completed traveler has no next step, whatever the fields say', () => {
    expect(nextOnboardingStep({ ...BLANK, onboardingCompleted: true })).toBeNull();
    expect(nextOnboardingStep(DONE)).toBeNull();
  });
});

describe('the gate before authentication resolves', () => {
  it('moves nobody while auth is restoring', () => {
    expect(destinationFor(gate({ auth: 'restoring', segment: 'itineraries' }))).toBeNull();
    expect(isSettling(gate({ auth: 'restoring' }))).toBe(true);
  });

  it('sends a signed-out traveler on a protected route to welcome', () => {
    expect(destinationFor(gate({ auth: 'signedOut', segment: 'itineraries' }))).toBe(WELCOME_ROUTE);
  });

  it('leaves a signed-out traveler on a public route alone', () => {
    expect(destinationFor(gate({ auth: 'signedOut', segment: 'sign-up' }))).toBeNull();
  });
});

describe('the verification gate', () => {
  it('an unverified traveler is pulled to the code screen from anywhere', () => {
    expect(destinationFor(gate({ emailVerified: false, segment: 'itineraries' }))).toBe(
      VERIFY_CODE_ROUTE,
    );
    expect(destinationFor(gate({ emailVerified: false, segment: 'sign-up' }))).toBe(
      VERIFY_CODE_ROUTE,
    );
    expect(destinationFor(gate({ emailVerified: false, segment: 'onboarding' }))).toBe(
      VERIFY_CODE_ROUTE,
    );
  });

  it('and is left alone once there', () => {
    expect(destinationFor(gate({ emailVerified: false, segment: 'verify-code' }))).toBeNull();
  });

  it('a Google sign-in arrives verified and therefore never sees the code screen', () => {
    expect(destinationFor(gate({ emailVerified: true, profile: BLANK, segment: undefined }))).toBe(
      ONBOARDING_ROUTES.profile,
    );
  });

  it('once verified, the code screen is not a place to stay', () => {
    expect(destinationFor(gate({ segment: 'verify-code' }))).toBe(SIGNED_IN_HOME);
  });
});

describe('the onboarding gate', () => {
  it('routes an un-onboarded traveler into the flow from any app route', () => {
    expect(destinationFor(gate({ profile: BLANK, segment: 'itineraries' }))).toBe(
      ONBOARDING_ROUTES.profile,
    );
  });

  it('an existing NULL-handle account is routed exactly once, then never again', () => {
    const existing: OnboardingProfile = { ...BLANK, handle: null };

    expect(destinationFor(gate({ profile: existing, segment: undefined }))).toBe(
      ONBOARDING_ROUTES.profile,
    );
    expect(destinationFor(gate({ profile: DONE, segment: undefined }))).toBeNull();
  });

  it('never interrupts a traveler already walking the flow', () => {
    expect(destinationFor(gate({ profile: BLANK, segment: 'onboarding' }))).toBeNull();
  });

  it('a completed traveler is never re-prompted, even with fields since emptied', () => {
    const emptiedButComplete: OnboardingProfile = { ...BLANK, onboardingCompleted: true };

    expect(destinationFor(gate({ profile: emptiedButComplete, segment: 'itineraries' }))).toBeNull();
  });

  it('a completed traveler may still open an onboarding route, which is how Edit profile works', () => {
    expect(destinationFor(gate({ profile: DONE, segment: 'onboarding' }))).toBeNull();
  });

  it('a completed traveler landing on a public route goes home', () => {
    expect(destinationFor(gate({ segment: 'welcome' }))).toBe(SIGNED_IN_HOME);
  });
});

describe('while the profile is still unknown', () => {
  it('nobody is routed anywhere on a guess', () => {
    expect(destinationFor(gate({ profile: null, segment: 'itineraries' }))).toBeNull();
    expect(isSettling(gate({ profile: null, segment: 'sign-up' }))).toBe(true);
  });

  it('but a profile that cannot be read must not strand the traveler on a splash', () => {
    const unreadable = gate({ profile: null, profileUnreadable: true, segment: 'sign-up' });

    expect(destinationFor(unreadable)).toBe(SIGNED_IN_HOME);
    expect(isSettling(unreadable)).toBe(false);
  });

  it('an unreadable profile deep in the app leaves the screen to report its own error', () => {
    const unreadable = gate({ profile: null, profileUnreadable: true, segment: 'itineraries' });

    expect(destinationFor(unreadable)).toBeNull();
    expect(isSettling(unreadable)).toBe(false);
  });
});

describe('the gate settles rather than looping', () => {
  it('every destination it produces is a place it then leaves the traveler alone', () => {
    const journeys: GateInput[] = [
      gate({ auth: 'signedOut', segment: 'itineraries' }),
      gate({ emailVerified: false, segment: 'itineraries' }),
      gate({ profile: BLANK, segment: 'itineraries' }),
      gate({ segment: 'welcome' }),
    ];

    for (const start of journeys) {
      const destination = destinationFor(start);
      expect(destination).not.toBeNull();

      const arrivedSegment = segmentOf(destination as string);
      expect(destinationFor({ ...start, segment: arrivedSegment })).toBeNull();
    }
  });
});

function segmentOf(route: string): string | undefined {
  const first = route.split('?')[0]?.split('/').filter(Boolean)[0];
  return first;
}
