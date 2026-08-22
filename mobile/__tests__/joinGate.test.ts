import { isJoinRoute, JOIN_SEGMENT, SIGNED_IN_HOME } from '../src/navigation/authRoutes';
import {
  destinationFor,
  isSettling,
  landingAfterSignIn,
  VERIFY_CODE_ROUTE,
  type GateInput,
} from '../src/onboarding/onboardingGate';
import { joinRouteFor, tokenFromJoinPath } from '../src/join/pendingJoin';

const TOKEN = ['join', 'link', 'sample', '1234567890', 'abcdefghij'].join('_');

function gate(over: Partial<GateInput> = {}): GateInput {
  return {
    auth: 'signedIn',
    emailVerified: true,
    profile: { handle: 'someone', interests: ['food'], country: 'PH', onboardingCompleted: true },
    profileUnreadable: false,
    segment: undefined,
    ...over,
  };
}

describe('the join segment', () => {
  it('is recognised as its own thing, not as a public route', () => {
    expect(isJoinRoute(JOIN_SEGMENT)).toBe(true);
    expect(isJoinRoute('welcome')).toBe(false);
  });

  it('admits a signed-out visitor — the app’s only pre-auth screen', () => {
    expect(destinationFor(gate({ auth: 'signedOut', segment: JOIN_SEGMENT }))).toBeNull();
  });

  it('stops holding a signed-out visitor behind the splash', () => {
    expect(isSettling(gate({ auth: 'signedOut', segment: JOIN_SEGMENT }))).toBe(false);
  });

  it('still waits while auth restores — the CTA depends on whether a bearer is coming', () => {
    expect(isSettling(gate({ auth: 'restoring', segment: JOIN_SEGMENT }))).toBe(true);
  });

  it('leaves a signed-in traveler on the landing rather than bouncing them Home', () => {
    expect(destinationFor(gate({ segment: JOIN_SEGMENT }))).toBeNull();
  });

  it('does not divert an unverified traveler off the landing', () => {
    expect(destinationFor(gate({ emailVerified: false, segment: JOIN_SEGMENT }))).toBeNull();
  });

  it('still sends a signed-out visitor away from anywhere else', () => {
    expect(destinationFor(gate({ auth: 'signedOut', segment: 'trips' }))).toBe('/welcome');
  });

  it('still holds an unverified traveler at verification everywhere else', () => {
    expect(destinationFor(gate({ emailVerified: false, segment: 'trips' }))).toBe(VERIFY_CODE_ROUTE);
  });
});

describe('returning from sign-up with a link in hand', () => {
  it('lands on the invitation rather than Home', () => {
    expect(destinationFor(gate({ segment: 'welcome', pendingJoinToken: TOKEN }))).toBe(
      joinRouteFor(TOKEN),
    );
  });

  it('lands Home when no link is waiting', () => {
    expect(destinationFor(gate({ segment: 'welcome' }))).toBe(SIGNED_IN_HOME);
    expect(destinationFor(gate({ segment: 'welcome', pendingJoinToken: null }))).toBe(
      SIGNED_IN_HOME,
    );
  });

  it('survives the verify-code round trip', () => {
    expect(destinationFor(gate({ segment: 'verify-code', pendingJoinToken: TOKEN }))).toBe(
      joinRouteFor(TOKEN),
    );
  });

  it('carries an unreadable profile to the landing too', () => {
    expect(
      destinationFor(
        gate({
          profile: null,
          profileUnreadable: true,
          segment: 'welcome',
          pendingJoinToken: TOKEN,
        }),
      ),
    ).toBe(joinRouteFor(TOKEN));
  });

  it('finishes onboarding before it honours the link', () => {
    expect(
      destinationFor(
        gate({
          profile: { handle: null, interests: [], country: null, onboardingCompleted: false },
          segment: 'welcome',
          pendingJoinToken: TOKEN,
        }),
      ),
    ).toBe('/onboarding/profile');
  });
});

describe('leaving onboarding with a link still in hand', () => {
  it('lands on the postcard the traveler arrived from, not Home', () => {
    expect(landingAfterSignIn(TOKEN)).toBe(joinRouteFor(TOKEN));
  });

  it('lands Home when nobody arrived from a link', () => {
    expect(landingAfterSignIn(null)).toBe(SIGNED_IN_HOME);
    expect(landingAfterSignIn(undefined)).toBe(SIGNED_IN_HOME);
  });
});

describe('waiting for storage to say whether a link is waiting', () => {
  it('holds rather than guessing Home while the answer is still coming', () => {
    const cold = gate({ segment: 'welcome', pendingJoinToken: null, pendingJoinSettled: false });

    expect(destinationFor(cold)).toBeNull();
    expect(isSettling(cold)).toBe(true);
  });

  it('goes Home the moment storage answers with nothing', () => {
    const answered = gate({
      segment: 'welcome',
      pendingJoinToken: null,
      pendingJoinSettled: true,
    });

    expect(destinationFor(answered)).toBe(SIGNED_IN_HOME);
    expect(isSettling(answered)).toBe(false);
  });

  it('goes to the landing the moment storage answers with a token', () => {
    const answered = gate({
      segment: 'welcome',
      pendingJoinToken: TOKEN,
      pendingJoinSettled: true,
    });

    expect(destinationFor(answered)).toBe(joinRouteFor(TOKEN));
  });

  it('never holds a traveler who still owes onboarding', () => {
    const owing = gate({
      profile: { handle: null, interests: [], country: null, onboardingCompleted: false },
      segment: 'welcome',
      pendingJoinSettled: false,
    });

    expect(destinationFor(owing)).toBe('/onboarding/profile');
    expect(isSettling(owing)).toBe(false);
  });
});

describe('reading a token out of a link', () => {
  it('takes the token from a join path', () => {
    expect(tokenFromJoinPath(`/join/${TOKEN}`)).toBe(TOKEN);
  });

  it('ignores anything after the token', () => {
    expect(tokenFromJoinPath(`/join/${TOKEN}?from=chat`)).toBe(TOKEN);
  });

  it('ignores the card version the server appends, whatever it has climbed to', () => {
    expect(tokenFromJoinPath(`/join/${TOKEN}?v=1`)).toBe(TOKEN);
    expect(tokenFromJoinPath(`/join/${TOKEN}?v=417`)).toBe(TOKEN);
    expect(tokenFromJoinPath(`/join/${TOKEN}?v=2&from=chat`)).toBe(TOKEN);
  });

  it('refuses a path that is not a join link', () => {
    expect(tokenFromJoinPath('/trips')).toBeNull();
    expect(tokenFromJoinPath('/join/')).toBeNull();
  });

  it('accepts the SHORT token the server now mints — 8 bytes is 11 characters', () => {
    expect(tokenFromJoinPath('/join/Ab3-_9xKq7Z')).toBe('Ab3-_9xKq7Z');
  });

  it('refuses a token that could not have been minted', () => {
    expect(tokenFromJoinPath('/join/short')).toBeNull();
    expect(tokenFromJoinPath('/join/has spaces and punctuation!')).toBeNull();
  });
});
