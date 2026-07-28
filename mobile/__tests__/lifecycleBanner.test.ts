import { deviceToday, lifecycleBanner } from '../src/itineraries/lifecycleBanner';
import { formatItineraryState } from '../src/itineraries/formatItineraryState';

/**
 * The owner's lifecycle banner and its date nudge (S1.7, ticket 02).
 *
 * <p>Register #10's resolution has two halves and this is where both are pinned: transitions are the
 * owner's explicit act (so a member is offered nothing), and dates only *suggest* (so an overdue trip
 * changes the copy, never the state). The screen renders this function's answer; it holds no logic of
 * its own, for the reason `memberControls` records — this repo cannot render a screen in Jest.
 */

const TODAY = '2027-01-15';

const trip = (state: string, startDate: string | null = null, endDate: string | null = null) => ({
  state,
  startDate,
  endDate,
});

describe('who sees a lever at all', () => {
  it('offers the owner Start on a draft', () => {
    expect(lifecycleBanner(trip('draft'), true, TODAY)).toEqual({ act: 'start', overdue: false });
  });

  it('offers the owner Complete on an active trip', () => {
    expect(lifecycleBanner(trip('active'), true, TODAY)).toEqual({ act: 'complete', overdue: false });
  });

  it('offers a member nothing — lifecycle is the owner’s', () => {
    // S1.3's split: members shape the plan, the owner keeps lifecycle, membership and existence. The
    // server answers 403 regardless; this is why they are not shown a button that would be refused.
    expect(lifecycleBanner(trip('draft'), false, TODAY)).toBeNull();
    expect(lifecycleBanner(trip('active'), false, TODAY)).toBeNull();
  });

  it('offers nothing once the trip is completed — the machine is forward-only', () => {
    expect(lifecycleBanner(trip('completed'), true, TODAY)).toBeNull();
  });

  it('offers nothing for a state this build has never heard of', () => {
    // ADR-008 lets the server send new values within /v1 — `published` arrives at S4.1 and this app is
    // already installed. Silence is the only safe answer: offering a transition out of an unknown state
    // would be a guess about a machine this build does not know.
    expect(lifecycleBanner(trip('published'), true, TODAY)).toBeNull();
    expect(lifecycleBanner(trip('something-new'), true, TODAY)).toBeNull();
  });
});

describe('the date nudge', () => {
  it('flags a draft whose start date has passed', () => {
    expect(lifecycleBanner(trip('draft', '2027-01-10'), true, TODAY)).toEqual({ act: 'start', overdue: true });
  });

  it('flags an active trip whose end date has passed', () => {
    expect(lifecycleBanner(trip('active', '2027-01-01', '2027-01-14'), true, TODAY)).toEqual({
      act: 'complete',
      overdue: true,
    });
  });

  it('does not flag a trip whose date is still ahead', () => {
    expect(lifecycleBanner(trip('draft', '2027-02-01'), true, TODAY)).toEqual({ act: 'start', overdue: false });
    expect(lifecycleBanner(trip('active', null, '2027-02-01'), true, TODAY)).toEqual({
      act: 'complete',
      overdue: false,
    });
  });

  it('does not flag on the date itself — a trip starting today is not overdue', () => {
    expect(lifecycleBanner(trip('draft', TODAY), true, TODAY)).toEqual({ act: 'start', overdue: false });
    expect(lifecycleBanner(trip('active', null, TODAY), true, TODAY)).toEqual({ act: 'complete', overdue: false });
  });

  it('never flags an undated trip, and still offers the lever', () => {
    // "Japan, someday" is a legitimate plan (S0.3). It must stay startable — just without a suggestion,
    // since there is no date to suggest from.
    expect(lifecycleBanner(trip('draft', null, null), true, TODAY)).toEqual({ act: 'start', overdue: false });
    expect(lifecycleBanner(trip('active', null, null), true, TODAY)).toEqual({ act: 'complete', overdue: false });
  });

  it('reads a draft’s nudge from the start date even when the end date has also passed', () => {
    // The forgetful owner: a trip that came and went while still a draft. The question this banner asks
    // is "has it begun?", so it nudges from `startDate` — and offers Start, never Complete.
    const forgotten = lifecycleBanner(trip('draft', '2027-01-01', '2027-01-10'), true, TODAY);

    expect(forgotten).toEqual({ act: 'start', overdue: true });
  });
});

describe('the strict two-tap path', () => {
  it('never offers Complete on a draft, however overdue', () => {
    // Spec decision 9: the machine has no skip edge, so Complete here would earn a 409 the traveler
    // cannot act on. They Start first; the complete nudge then appears.
    const banner = lifecycleBanner(trip('draft', '2020-01-01', '2020-01-10'), true, TODAY);

    expect(banner?.act).toBe('start');
    expect(banner?.act).not.toBe('complete');
  });
});

describe('deviceToday', () => {
  it('reads the local calendar date, not UTC', () => {
    // A traveler in Manila (UTC+8) just after midnight: `toISOString()` would still say *yesterday*,
    // so a trip starting today would read as overdue a day early. Local parts are the fix.
    const justAfterLocalMidnight = new Date(2027, 0, 15, 0, 30);

    expect(deviceToday(justAfterLocalMidnight)).toBe('2027-01-15');
  });

  it('zero-pads so the string sorts chronologically', () => {
    // The whole comparison in `lifecycleBanner` relies on YYYY-MM-DD sorting lexicographically; an
    // unpadded "2027-1-5" would break that silently for nine months of the year.
    expect(deviceToday(new Date(2027, 0, 5))).toBe('2027-01-05');
  });
});

describe('the state badge', () => {
  it('names the three states this build knows', () => {
    expect(formatItineraryState('draft')).toBe('Draft');
    expect(formatItineraryState('active')).toBe('Active');
    expect(formatItineraryState('completed')).toBe('Completed');
  });

  it('renders an unknown state as itself rather than blanking the badge', () => {
    // S4.1's `published` will arrive with no release of this app. A badge that vanished on the state
    // that is the most interesting thing about a trip is worse than one showing the server's own word.
    expect(formatItineraryState('published')).toBe('Published');
    expect(formatItineraryState('archived')).toBe('Archived');
  });
});
