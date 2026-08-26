import {
  PEOPLE_RESULTS_PATHNAME,
  PUBLIC_PROFILE_PATHNAME,
  peopleResultsRoute,
  publicProfileRoute,
  travelerDestination,
} from '../src/profile/travelerRoutes';
import { PROFILE_TAB_ROUTE } from '../src/navigation/authRoutes';

describe('travelerDestination — C4, the self re-ruling: your own handle never renders the public screen', () => {
  it('sends a tap on somebody else to their public profile', () => {
    expect(travelerDestination('mayasantos', 'kaicabrera')).toEqual({
      kind: 'public',
      handle: 'mayasantos',
    });
  });

  it('sends a tap on your own byline to your own Profile tab', () => {
    expect(travelerDestination('mayasantos', 'mayasantos')).toEqual({ kind: 'own' });
  });

  it('recognises yourself whatever case either handle arrives in', () => {
    expect(travelerDestination('MayaSantos', ' mayasantos ')).toEqual({ kind: 'own' });
  });

  it('goes nowhere when the subject carries no handle, rather than routing to a broken address', () => {
    expect(travelerDestination(null, 'mayasantos')).toEqual({ kind: 'nowhere' });
    expect(travelerDestination('   ', 'mayasantos')).toEqual({ kind: 'nowhere' });
    expect(travelerDestination(undefined, 'mayasantos')).toEqual({ kind: 'nowhere' });
  });

  it('treats a signed-in viewer with no handle as somebody else, so the public page still opens', () => {
    expect(travelerDestination('mayasantos', null)).toEqual({
      kind: 'public',
      handle: 'mayasantos',
    });
  });
});


describe('the routes themselves', () => {
  it('addresses a public profile by handle, which is the address while the id stays the identity', () => {
    expect(publicProfileRoute('mayasantos')).toEqual({
      pathname: PUBLIC_PROFILE_PATHNAME,
      params: { handle: 'mayasantos' },
    });
  });

  it('carries the live query onto the people results route so a deep link restores it', () => {
    expect(peopleResultsRoute('ma')).toEqual({
      pathname: PEOPLE_RESULTS_PATHNAME,
      params: { q: 'ma' },
    });
  });

  it('keeps the own-profile destination pointed at the Profile tab constant, not a copied literal', () => {
    expect(PROFILE_TAB_ROUTE).toBe('/profile');
  });
});
