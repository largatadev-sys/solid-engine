import {
  afterDeleteRoute,
  afterSaveRoute,
  entryEditorRoute,
  profileStackExit,
} from '../src/diary/diaryEntryExit';


const TRIP = 'trip-1';
const TITLE = 'Sunset at Las Cabanas';


describe('where the diary entry screen goes when it is finished, per the stack that opened it', () => {
  it('lands a save on the posted confirmation when the trip opened it', () => {
    expect(afterSaveRoute('trip', TRIP, TITLE)).toEqual({
      pathname: '/itineraries/[id]/diary/posted',
      params: { id: TRIP, title: TITLE, saved: 'true' },
    });
  });

  it('returns a save to the profile when the profile opened it, rather than flinging the traveler into the trip stack', () => {
    expect(afterSaveRoute('profile', TRIP, TITLE)).toEqual({ pathname: '/profile' });
  });

  it('lands a delete on the trip when the trip opened it', () => {
    expect(afterDeleteRoute('trip', TRIP)).toEqual({
      pathname: '/itineraries/[id]',
      params: { id: TRIP },
    });
  });

  it('returns a delete to the profile when the profile opened it', () => {
    expect(afterDeleteRoute('profile', TRIP)).toEqual({ pathname: '/profile' });
  });

  it('never sends the profile-s traveler to a route in the trip stack (S4.13: stacks do not share history)', () => {
    for (const route of [afterSaveRoute('profile', TRIP, TITLE), afterDeleteRoute('profile', TRIP)]) {
      expect(route.pathname).not.toContain('/itineraries/');
    }
  });
});


describe('the trip diary is its own exit — a save there returns to what the traveler was reading', () => {
  it('returns a save to the trip diary, not two levels out to the profile tab', () => {
    expect(afterSaveRoute('tripDiary', TRIP, TITLE)).toEqual({
      pathname: '/diary/[id]',
      params: { id: TRIP },
    });
  });

  it('returns a delete to the trip diary too — the entry is gone, the stream it left is not', () => {
    expect(afterDeleteRoute('tripDiary', TRIP)).toEqual({
      pathname: '/diary/[id]',
      params: { id: TRIP },
    });
  });

  it('keeps the editor in the profile stack, carrying which entry point opened it', () => {
    expect(entryEditorRoute('tripDiary', TRIP, 'entry-1')).toEqual({
      pathname: '/diary/[id]/[entryId]',
      params: { id: TRIP, entryId: 'entry-1', from: 'tripDiary' },
    });
  });

  it('leaves the profile tab-s own editor route pointing back at the tab', () => {
    expect(entryEditorRoute('profile', TRIP, 'entry-1')).toEqual({
      pathname: '/diary/[id]/[entryId]',
      params: { id: TRIP, entryId: 'entry-1', from: 'profile' },
    });
  });

  it('reads the entry point back off the route param, defaulting to the tab when absent', () => {
    expect(profileStackExit('tripDiary')).toBe('tripDiary');
    expect(profileStackExit('profile')).toBe('profile');
    expect(profileStackExit(undefined)).toBe('profile');
    expect(profileStackExit('nonsense')).toBe('profile');
  });

  it('stays out of the trip stack, like every other profile-stack exit (S4.13)', () => {
    for (const route of [
      afterSaveRoute('tripDiary', TRIP, TITLE),
      afterDeleteRoute('tripDiary', TRIP),
      entryEditorRoute('tripDiary', TRIP, 'entry-1'),
    ]) {
      expect(route.pathname).not.toContain('/itineraries/');
    }
  });
});
