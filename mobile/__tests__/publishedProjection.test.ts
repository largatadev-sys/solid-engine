import {
  bylineHandle,
  destinationPillLabel,
  durationLabel,
  estimatedTotalLabel,
} from '../src/itineraries/publishedProjection';

describe('destinationPillLabel', () => {
  it('shouts the destination the way the mock draws it', () => {
    expect(destinationPillLabel(['Palawan'])).toBe('PALAWAN');
  });

  it('joins a multi-destination trip rather than dropping the rest', () => {
    expect(destinationPillLabel(['Palawan', 'Cebu'])).toBe('PALAWAN · CEBU');
  });

  it('has nothing to render for a trip with no destinations', () => {
    expect(destinationPillLabel([])).toBeUndefined();
  });
});

describe('durationLabel', () => {
  it('counts days, not the date span — the absence rule', () => {
    expect(durationLabel(5)).toBe('5 Days');
    expect(durationLabel(1)).toBe('1 Day');
  });

  it('says nothing about a plan with no days rather than showing a zero', () => {
    expect(durationLabel(0)).toBeUndefined();
  });
});

describe('estimatedTotalLabel', () => {
  it('renders the derived total with its currency sign', () => {
    expect(estimatedTotalLabel({ amount: '2000.50', currency: 'PHP' })).toBe('₱2,000.50');
  });

  it('renders a bare number when the creator stated no currency', () => {
    expect(estimatedTotalLabel({ amount: '800.00', currency: null })).toBe('800');
  });

  it('renders nothing at all when the plan has no single-currency total', () => {
    expect(estimatedTotalLabel(null)).toBeUndefined();
  });
});

describe('bylineHandle', () => {
  it('prefixes a handle so the creator block reads like the mock', () => {
    expect(bylineHandle('josetravels')).toBe('@josetravels');
  });

  it('renders nothing for a traveler who has not taken a handle', () => {
    expect(bylineHandle(null)).toBeUndefined();
  });
});
