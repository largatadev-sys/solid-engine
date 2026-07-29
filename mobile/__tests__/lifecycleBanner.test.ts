import { deviceToday, lifecycleBanner } from '../src/itineraries/lifecycleBanner';
import { formatItineraryState } from '../src/itineraries/formatItineraryState';



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
    expect(lifecycleBanner(trip('draft'), false, TODAY)).toBeNull();
    expect(lifecycleBanner(trip('active'), false, TODAY)).toBeNull();
  });

  it('offers nothing once the trip is completed — the machine is forward-only', () => {
    expect(lifecycleBanner(trip('completed'), true, TODAY)).toBeNull();
  });

  it('offers nothing for a state this build has never heard of', () => {
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
    expect(lifecycleBanner(trip('draft', null, null), true, TODAY)).toEqual({ act: 'start', overdue: false });
    expect(lifecycleBanner(trip('active', null, null), true, TODAY)).toEqual({ act: 'complete', overdue: false });
  });

  it('reads a draft’s nudge from the start date even when the end date has also passed', () => {
    const forgotten = lifecycleBanner(trip('draft', '2027-01-01', '2027-01-10'), true, TODAY);

    expect(forgotten).toEqual({ act: 'start', overdue: true });
  });
});

describe('the strict two-tap path', () => {
  it('never offers Complete on a draft, however overdue', () => {
    const banner = lifecycleBanner(trip('draft', '2020-01-01', '2020-01-10'), true, TODAY);

    expect(banner?.act).toBe('start');
    expect(banner?.act).not.toBe('complete');
  });
});

describe('deviceToday', () => {
  it('reads the local calendar date, not UTC', () => {
    const justAfterLocalMidnight = new Date(2027, 0, 15, 0, 30);

    expect(deviceToday(justAfterLocalMidnight)).toBe('2027-01-15');
  });

  it('zero-pads so the string sorts chronologically', () => {
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
    expect(formatItineraryState('published')).toBe('Published');
    expect(formatItineraryState('archived')).toBe('Archived');
  });
});
