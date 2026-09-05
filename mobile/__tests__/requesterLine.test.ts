import { requesterLine } from '../src/profile/privateProfileCopy';

describe('a request row says who asked and when, on one line (S4.40)', () => {
  it('joins the handle and the ago with the separator the rest of the app uses', () => {
    expect(requesterLine('@mayaocampo', '2d ago')).toBe('@mayaocampo · 2d ago');
  });

  it('carries whatever the handle helper gave it, including its fallback', () => {
    expect(requesterLine('A traveler', '1w ago')).toBe('A traveler · 1w ago');
  });

  it('reads the same in weeks, which is what the canvas draws', () => {
    expect(requesterLine('@anaduarte', '2w ago')).toBe('@anaduarte · 2w ago');
  });

  it('never says "Asked", because the screen it sits on is titled Follow requests', () => {
    expect(requesterLine('@x', '1d ago')).not.toContain('Asked');
  });
});
