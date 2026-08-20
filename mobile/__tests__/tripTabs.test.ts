import {
  editingAdvisory,
  landingTab,
  tabOf,
  TRIP_TABS,
  tabLabel,
  tabEmptyCopy,
  showsCreateBar,
  showsArchivedLink,
  tripsInTab,
  tripCardSubline,
} from '../src/itineraries/tripTabs';
import type { ItineraryResponse, ItineraryState } from '../src/types/api';


const EVERY_STATE: ItineraryState[] = ['upcoming', 'ongoing', 'completed'];


function trip(over: Partial<ItineraryResponse> = {}): ItineraryResponse {
  return {
    id: over.id ?? 'id',
    title: over.title ?? 'A trip',
    destination: 'El Nido, Palawan',
    state: 'upcoming',
    published: false,
    visibility: 'public',
    archived: false,
    ...over,
  } as ItineraryResponse;
}


describe('the Trips tabs (S4.26, canvas C1)', () => {
  it('renders exactly three tabs in ladder order — the tab is the lifecycle fact', () => {
    expect(TRIP_TABS).toEqual(['upcoming', 'ongoing', 'completed']);
  });

  it('labels each tab with its own state name, and nothing dead', () => {
    expect(TRIP_TABS.map(tabLabel)).toEqual(['Upcoming', 'Ongoing', 'Completed']);
    expect(TRIP_TABS.map(tabLabel)).not.toContain('Draft');
    expect(TRIP_TABS.map(tabLabel)).not.toContain('Ready');
    expect(TRIP_TABS.map(tabLabel)).not.toContain('Active');
  });

  it('puts every trip in exactly one tab, because the tabs are the lifecycle', () => {
    EVERY_STATE.forEach((state) => expect(tabOf(trip({ state }))).toBe(state));
  });

  it('tabs a published trip by its lifecycle, because discovery is a different axis', () => {
    expect(tabOf(trip({ state: 'completed', published: true, visibility: 'private' }))).toBe(
      'completed',
    );
  });

  it('preserves the order the server sent within a tab', () => {
    const rows = tripsInTab(
      [trip({ id: 'first', state: 'completed' }), trip({ id: 'second', state: 'completed' })],
      'completed',
    );

    expect(rows.map((t) => t.id)).toEqual(['first', 'second']);
  });

  it('keeps an archived trip out of every tab — a different axis, never a bucket here', () => {
    const rows = [trip({ id: 'live' }), trip({ id: 'filed', archived: true })];

    TRIP_TABS.forEach((tab) =>
      expect(tripsInTab(rows, tab).map((t) => t.id)).not.toContain('filed'),
    );
    expect(tripsInTab(rows, 'upcoming').map((t) => t.id)).toEqual(['live']);
  });
});


describe('adaptive landing (canvas C2)', () => {
  it('lands on Ongoing when it holds a trip — mid-trip is the one obvious answer', () => {
    expect(landingTab([trip({ state: 'upcoming' }), trip({ state: 'ongoing' })], null)).toBe(
      'ongoing',
    );
  });

  it('lands on Upcoming when nothing is under way', () => {
    expect(landingTab([trip({ state: 'upcoming' }), trip({ state: 'completed' })], null)).toBe(
      'upcoming',
    );
  });

  it('lands on Upcoming for a traveler with no trips at all', () => {
    expect(landingTab([], null)).toBe('upcoming');
  });

  it('never lands on Completed, however many trips sit there', () => {
    expect(landingTab([trip({ state: 'completed' }), trip({ state: 'completed' })], null)).toBe(
      'upcoming',
    );
  });

  it('never counts an archived trip as an ongoing one', () => {
    expect(landingTab([trip({ state: 'ongoing', archived: true })], null)).toBe('upcoming');
  });

  it('lets a manual pick win over the adaptive rule for the rest of the session', () => {
    const rows = [trip({ state: 'ongoing' })];

    expect(landingTab(rows, 'completed')).toBe('completed');
    expect(landingTab(rows, 'upcoming')).toBe('upcoming');
    expect(landingTab(rows, 'ongoing')).toBe('ongoing');
  });
});


describe('per-tab empty copy (canvas C4)', () => {
  it('gives each tab the one line the canvas draws, verbatim', () => {
    expect(tabEmptyCopy('upcoming')).toBe('No trips on the horizon yet.');
    expect(tabEmptyCopy('ongoing')).toBe('No trip underway right now.');
    expect(tabEmptyCopy('completed')).toBe("Trips you've travelled will collect here.");
  });

  it('never mentions a draft — the old copy went with the state', () => {
    TRIP_TABS.forEach((tab) => expect(tabEmptyCopy(tab)).not.toMatch(/draft/i));
  });
});


describe('the create bar and the archived link (canvas C4, C6)', () => {
  it('rides the Upcoming tab always — populated and empty alike', () => {
    expect(showsCreateBar('upcoming')).toBe(true);
  });

  it('never sells creation on Ongoing or Completed', () => {
    expect(showsCreateBar('ongoing')).toBe(false);
    expect(showsCreateBar('completed')).toBe(false);
  });

  it('opens the archived list from Completed alone — archives come off the end of the lifecycle', () => {
    expect(showsArchivedLink('completed')).toBe(true);
    expect(showsArchivedLink('upcoming')).toBe(false);
    expect(showsArchivedLink('ongoing')).toBe(false);
  });

  it('puts creation and the archive on different tabs — they never share one', () => {
    TRIP_TABS.forEach((tab) => expect(showsCreateBar(tab) && showsArchivedLink(tab)).toBe(false));
  });
});


describe('the card sub-line (canvas C3)', () => {
  it('reads destination then day count, joined by the canvas separator', () => {
    expect(tripCardSubline(trip({ destination: 'Kyoto, Japan', dayCount: 6 }))).toBe(
      'Kyoto, Japan · 6 days',
    );
  });

  it('says one day in the singular rather than 1 days', () => {
    expect(tripCardSubline(trip({ destination: 'Cebu', dayCount: 1 }))).toBe('Cebu · 1 day');
  });

  it('falls back to the destination alone when the plan has no days yet', () => {
    expect(tripCardSubline(trip({ destination: 'Cebu', dayCount: 0 }))).toBe('Cebu');
  });

  it('falls back to the destination alone when an older server sends no count at all', () => {
    expect(tripCardSubline(trip({ destination: 'Cebu' }))).toBe('Cebu');
  });
});


describe("the card's advisory slot", () => {
  it('shows the advisory on any card whose trip is being edited right now', () => {
    expect(editingAdvisory(trip({ beingEdited: true }))).toBe('Currently being edited');
    expect(editingAdvisory(trip({ state: 'completed', beingEdited: true }))).toBe(
      'Currently being edited',
    );
  });

  it('shows nothing when nobody is in there, including when the server omits the field', () => {
    expect(editingAdvisory(trip({ beingEdited: false }))).toBeNull();
    expect(editingAdvisory(trip({}))).toBeNull();
  });
});
