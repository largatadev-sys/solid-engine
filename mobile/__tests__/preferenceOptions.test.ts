import {
  EARN_GOAL,
  GOALS,
  INTERESTS,
  MIN_INTERESTS,
  hasEnoughGoals,
  hasEnoughInterests,
  interestsRemaining,
  labelsFor,
  toggle,
} from '../src/onboarding/preferenceOptions';

describe('the goal catalogue', () => {
  it('offers exactly the five the founder locked, in order (spec decision 5)', () => {
    expect(GOALS.map((goal) => goal.label)).toEqual([
      'Discover trips',
      'Plan a trip',
      'Plan with friends',
      'Share an itinerary',
      'Earn from my itineraries',
    ]);
  });

  it('carries the earn option with the value the backend measures', () => {
    expect(GOALS.some((goal) => goal.value === EARN_GOAL)).toBe(true);
  });

  it('promises nothing about earning, because nothing is built (spec decision 5)', () => {
    const earn = GOALS.find((goal) => goal.value === EARN_GOAL);

    expect(earn?.label).toBe('Earn from my itineraries');
    expect(earn?.label).not.toMatch(/\b(pay|paid|revenue|commission|money|monetis|monetiz)/i);
  });

  it('every goal carries the icon its design row draws', () => {
    for (const goal of GOALS) expect(goal.icon).toBeDefined();
  });

  it('every option has a stable machine value distinct from its label', () => {
    const values = [...GOALS, ...INTERESTS].map((option) => option.value);

    expect(new Set(values).size).toBe(values.length);
    for (const value of values) expect(value).toMatch(/^[a-z0-9_]+$/);
  });
});

describe('selection rules', () => {
  it('toggling adds then removes without disturbing the rest', () => {
    expect(toggle(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggle(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('goals need at least one', () => {
    expect(hasEnoughGoals([])).toBe(false);
    expect(hasEnoughGoals(['discover'])).toBe(true);
  });

  it('interests need at least three (spec decision 6, ticket 04)', () => {
    expect(hasEnoughInterests([])).toBe(false);
    expect(hasEnoughInterests(['adventure', 'luxury'])).toBe(false);
    expect(hasEnoughInterests(['adventure', 'luxury', 'nightlife'])).toBe(true);
    expect(hasEnoughInterests(['adventure', 'luxury', 'nightlife', 'budget'])).toBe(true);
  });

  it('the counter counts down to zero and stops there', () => {
    expect(interestsRemaining([])).toBe(MIN_INTERESTS);
    expect(interestsRemaining(['adventure'])).toBe(MIN_INTERESTS - 1);
    expect(interestsRemaining(['adventure', 'luxury', 'nightlife', 'budget'])).toBe(0);
  });
});

describe('the catalogues match the pasted design exactly', () => {
  it('the interest chips are the ten the export lists, in its order', () => {
    expect(INTERESTS.map((interest) => interest.label)).toEqual([
      'Budget',
      'Luxury',
      'Adventure',
      'Food & Culture',
      'Relaxation',
      'Nightlife',
      'Family Travel',
      'Solo Travel',
      'Group Travel',
      'Accessible Travel',
    ]);
  });
});

describe('turning stored values back into words', () => {
  it('maps values to their labels in the order chosen', () => {
    expect(labelsFor(GOALS, ['earn', 'discover'])).toEqual([
      'Earn from my itineraries',
      'Discover trips',
    ]);
  });

  it('drops a value the catalogue has never heard of', () => {
    expect(labelsFor(INTERESTS, ['adventure', 'teleportation'])).toEqual(['Adventure']);
  });
});
