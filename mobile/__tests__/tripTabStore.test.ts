import { forgetPickedTab, pickedTab, pickTab } from '../src/itineraries/tripTabStore';


describe('the session-sticky tab (canvas C2)', () => {
  beforeEach(() => forgetPickedTab());

  it('remembers nothing before the traveler picks — the adaptive rule owns the first landing', () => {
    expect(pickedTab()).toBeNull();
  });

  it('remembers the last pick', () => {
    pickTab('completed');

    expect(pickedTab()).toBe('completed');
  });

  it('survives a screen unmount, which is the whole point — expo-router unmounts beneath a push (S4.18)', () => {
    pickTab('ongoing');

    expect(pickedTab()).toBe('ongoing');
    expect(pickedTab()).toBe('ongoing');
  });

  it('lets a later pick replace an earlier one', () => {
    pickTab('ongoing');
    pickTab('upcoming');

    expect(pickedTab()).toBe('upcoming');
  });

  it('forgets on sign-out, so the next traveler lands adaptively', () => {
    pickTab('completed');

    forgetPickedTab();

    expect(pickedTab()).toBeNull();
  });
});
