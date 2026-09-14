import { readFileSync } from 'fs';
import { join } from 'path';
import { showsCount, unseenCount } from '../src/members/unseenCount';


const trips = readFileSync(join(__dirname, '..', 'app', '(tabs)', '(trips)', 'trips.tsx'), 'utf8');


describe('the count on the mail icon', () => {
  it('counts the invitations the traveler has not yet looked at', () => {
    expect(
      unseenCount([{ seenAt: null }, { seenAt: '2026-09-14T10:00:00Z' }, { seenAt: null }]),
    ).toBe(2);
  });

  it('is zero once every invitation carries a seen mark', () => {
    expect(unseenCount([{ seenAt: '2026-09-14T10:00:00Z' }, { seenAt: '2026-09-13T09:00:00Z' }])).toBe(
      0,
    );
  });

  it('is zero on an empty inbox', () => {
    expect(unseenCount([])).toBe(0);
  });

  it('NEVER counts an outgoing join request — the Trips header feeds it the inbox alone', () => {
    expect(trips).toContain('unseenCount(');
    expect(trips).not.toMatch(/unseenCount\([^)]*[Rr]equest/);
    expect(trips).not.toContain('useMyJoinRequests');
  });

  it('renders nothing at zero, because Home’s unconditional bell dot is not the shape to copy', () => {
    expect(showsCount(0)).toBe(false);
    expect(showsCount(1)).toBe(true);
    expect(showsCount(9)).toBe(true);
  });

  it('and the header actually ASKS before it renders — an unconditional badge passes the rule above', () => {
    expect(trips).toContain('showsCount(unseen)');
  });
});
