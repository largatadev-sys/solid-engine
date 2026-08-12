import { publishedBackRoute, publishedRoute } from '../src/itineraries/publishedExit';


const TRIP = 'trip-1';


describe('the published view lives in both stacks, and back follows the one that opened it (S4.13)', () => {
  it('returns to Trips when the trip stack opened it — at its own path since S4.22 took "/"', () => {
    expect(publishedBackRoute('trip')).toBe('/trips');
  });

  it('returns to the feed when a postcard opened it, so the reader lands back where they were', () => {
    expect(publishedBackRoute('feed')).toBe('/');
  });

  it('routes a feed card to the home stack-s own copy, or back could not pop onto the feed', () => {
    expect(publishedRoute('feed', TRIP)).toEqual({
      pathname: '/feed/published/[id]',
      params: { id: TRIP },
    });
  });

  it('returns to the profile when the Itineraries tab opened it, not into the trip stack', () => {
    expect(publishedBackRoute('profile')).toBe('/profile');
  });

  it('routes the profile-s showcase card to the profile stack-s own copy of the screen', () => {
    expect(publishedRoute('profile', TRIP)).toEqual({
      pathname: '/showcase/[id]',
      params: { id: TRIP },
    });
  });

  it('leaves the trip stack pointing at its published route, unmoved', () => {
    expect(publishedRoute('trip', TRIP)).toEqual({
      pathname: '/published/[id]',
      params: { id: TRIP },
    });
  });

  it('never sends the profile-s traveler to a route in the trip stack', () => {
    expect(publishedRoute('profile', TRIP).pathname).not.toContain('/published/');
    expect(publishedBackRoute('profile')).not.toBe('/');
  });
});
