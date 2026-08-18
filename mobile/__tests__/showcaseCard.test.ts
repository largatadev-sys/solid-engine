import { pricePillLabel, showcaseMetaLine } from '../src/profile/showcaseCard';


describe('showcaseMetaLine — the mock-s "El Nido, Palawan · 5 days"', () => {
  it('joins the destinations and the length the way the card draws them', () => {
    expect(showcaseMetaLine('Nagano, Japan', 3)).toBe('Nagano, Japan · 3 days');
  });

  it('carries the trip-s one destination before the length (S4.25)', () => {
    expect(showcaseMetaLine('Cebu', 5)).toBe('Cebu · 5 days');
  });

  it('says one day rather than 1 days', () => {
    expect(showcaseMetaLine('Tokyo', 1)).toBe('Tokyo · 1 day');
  });

  it('renders the destination alone when the trip has no days yet', () => {
    expect(showcaseMetaLine('Tokyo', 0)).toBe('Tokyo');
  });

  it('renders the length alone rather than a leading separator when there is no destination', () => {
    expect(showcaseMetaLine(null, 4)).toBe('4 days');
  });

  it('has nothing to say about a trip with neither, and says nothing', () => {
    expect(showcaseMetaLine(null, 0)).toBeNull();
  });
});


describe('pricePillLabel — the stub pill, in the mock-s wording', () => {
  it('groups the amount and carries the per-person suffix as drawn', () => {
    expect(pricePillLabel(22_000)).toBe('₱22,000 / person');
  });

  it('renders no pill at all when the stub switch is off', () => {
    expect(pricePillLabel(null)).toBeNull();
  });
});
