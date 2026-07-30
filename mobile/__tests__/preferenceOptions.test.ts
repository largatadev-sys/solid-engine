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

    expect(earn?.blurb).not.toMatch(/\b(pay|paid|revenue|commission|money|monetis|monetiz)/i);
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
    expect(hasEnoughInterests(['food', 'art'])).toBe(false);
    expect(hasEnoughInterests(['food', 'art', 'hiking'])).toBe(true);
    expect(hasEnoughInterests(['food', 'art', 'hiking', 'diving'])).toBe(true);
  });

  it('the counter counts down to zero and stops there', () => {
    expect(interestsRemaining([])).toBe(MIN_INTERESTS);
    expect(interestsRemaining(['food'])).toBe(MIN_INTERESTS - 1);
    expect(interestsRemaining(['food', 'art', 'hiking', 'diving'])).toBe(0);
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
    expect(labelsFor(INTERESTS, ['food', 'teleportation'])).toEqual(['Food']);
  });
});
