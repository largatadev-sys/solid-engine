import {
  SIGNED_IN_HOME,
  WELCOME_ROUTE,
  isPublicRoute,
  landingRouteFor,
} from '../src/navigation/authRoutes';

describe('which routes a signed-out traveler may see', () => {
  it.each(['welcome', 'sign-up', 'sign-in'])('%s is public', (segment) => {
    expect(isPublicRoute(segment)).toBe(true);
  });

  it.each(['itineraries', 'me', 'members', 'health', 'verify-code', 'onboarding'])('%s is not public', (segment) => {
    expect(isPublicRoute(segment)).toBe(false);
  });

  it('the root path is not public — an unauthenticated visitor never lands on My Trips', () => {
    expect(isPublicRoute(undefined)).toBe(false);
  });
});

describe('where the gate sends a traveler', () => {
  it('a signed-out traveler on a protected route goes to welcome', () => {
    expect(landingRouteFor('signedOut', undefined)).toBe(WELCOME_ROUTE);
    expect(landingRouteFor('signedOut', 'itineraries')).toBe(WELCOME_ROUTE);
  });

  it('a signed-out traveler already on a public route is left alone', () => {
    expect(landingRouteFor('signedOut', 'sign-up')).toBeNull();
    expect(landingRouteFor('signedOut', 'sign-in')).toBeNull();
    expect(landingRouteFor('signedOut', 'welcome')).toBeNull();
  });

  it('a signed-in traveler on a public route goes home', () => {
    expect(landingRouteFor('signedIn', 'sign-in')).toBe(SIGNED_IN_HOME);
    expect(landingRouteFor('signedIn', 'welcome')).toBe(SIGNED_IN_HOME);
  });

  it('a signed-in traveler deep in the app is left alone — the gate never interrupts navigation', () => {
    expect(landingRouteFor('signedIn', 'itineraries')).toBeNull();
    expect(landingRouteFor('signedIn', undefined)).toBeNull();
  });
});
