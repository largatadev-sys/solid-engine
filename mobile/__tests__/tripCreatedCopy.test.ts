import {
  TRIP_CREATED_TITLE,
  tripCreatedBody,
  tripCreatedMeta,
} from '../src/itineraries/tripCreatedCopy';

describe('the Trip Created overview says what is true of a born-draft trip (S4.15 decision 2)', () => {
  it('celebrates the trip, not a publication that has not happened', () => {
    expect(TRIP_CREATED_TITLE).toBe('Trip Created!');
  });

  it('names the trip and points at the workspace, in regular double quotes', () => {
    expect(tripCreatedBody('Island Hopping in El Nido')).toBe(
      '"Island Hopping in El Nido" is saved to your trips. Open the workspace to start building the days.',
    );
  });

  it('never claims the trip is discoverable — ADR-019 gates that on completed', () => {
    expect(tripCreatedBody('A trip')).not.toMatch(/discover|fork/i);
  });
});

describe('the summary meta line (S4.15 decision 2)', () => {
  it('reads destination then day count, joined by a bullet', () => {
    expect(tripCreatedMeta({ destinations: ['Palawan'], days: 5 })).toBe('Palawan • 5 Days');
  });

  it('says Day for a one-day trip, because "1 Days" reads as a bug', () => {
    expect(tripCreatedMeta({ destinations: ['Palawan'], days: 1 })).toBe('Palawan • 1 Day');
  });

  it('falls back to the destination alone when Duration was skipped', () => {
    expect(tripCreatedMeta({ destinations: ['Palawan'], days: 0 })).toBe('Palawan');
  });

  it('shows the day count alone when a trip somehow carries no destination', () => {
    expect(tripCreatedMeta({ destinations: [], days: 3 })).toBe('3 Days');
  });

  it('renders nothing rather than a stray bullet when it knows neither', () => {
    expect(tripCreatedMeta({ destinations: [], days: 0 })).toBe('');
  });

  it('joins multiple destinations the way the trip card does', () => {
    expect(tripCreatedMeta({ destinations: ['Palawan', 'Cebu'], days: 2 })).toBe(
      'Palawan · Cebu • 2 Days',
    );
  });
});
