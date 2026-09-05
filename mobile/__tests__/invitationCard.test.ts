import {
  compactDateRange,
  EXPIRY_URGENT_HOURS,
  expiryIsUrgent,
  expiryLabelOf,
  invitationHasExpired,
  invitedAgoLabel,
  inviterLine,
  tripMetaLine,
} from '../src/members/invitationCard';

const NOW = Date.parse('2026-02-20T12:00:00Z');

const inHours = (hours: number) => new Date(NOW + hours * 3_600_000).toISOString();

describe('the expiry line', () => {
  it('counts down in days, then hours, then the last stretch', () => {
    expect(expiryLabelOf(inHours(120), NOW)).toBe('Expires in 5 days');
    expect(expiryLabelOf(inHours(30), NOW)).toBe('Expires in 1 day');
    expect(expiryLabelOf(inHours(5), NOW)).toBe('Expires in 5 hours');
    expect(expiryLabelOf(inHours(1), NOW)).toBe('Expires in 1 hour');
    expect(expiryLabelOf(inHours(0.5), NOW)).toBe('Expires within the hour');
  });

  it('says nothing at all once the invitation is dead', () => {
    expect(expiryLabelOf(inHours(-1), NOW)).toBeNull();
  });

  it('turns urgent under 48 hours and not a moment sooner', () => {
    expect(expiryIsUrgent(inHours(EXPIRY_URGENT_HOURS + 1), NOW)).toBe(false);
    expect(expiryIsUrgent(inHours(EXPIRY_URGENT_HOURS - 1), NOW)).toBe(true);
  });

  it('reads the clock it is handed rather than the machine’s — the S4.22 trap', () => {
    const expiry = inHours(120);
    const twoDaysOn = NOW + 48 * 3_600_000;
    const aWeekOn = NOW + 168 * 3_600_000;

    expect(expiryLabelOf(expiry, NOW)).toBe('Expires in 5 days');
    expect(expiryLabelOf(expiry, twoDaysOn)).toBe('Expires in 3 days');
    expect(expiryLabelOf(expiry, aWeekOn)).toBeNull();
  });

  it('knows an expired card should never render', () => {
    expect(invitationHasExpired(inHours(-1), NOW)).toBe(true);
    expect(invitationHasExpired(inHours(1), NOW)).toBe(false);
  });

  it('survives a malformed timestamp rather than rendering NaN at a traveler', () => {
    expect(expiryLabelOf('not a date', NOW)).toBeNull();
    expect(expiryIsUrgent('not a date', NOW)).toBe(false);
    expect(invitationHasExpired('not a date', NOW)).toBe(false);
  });
});

describe('the inviter line', () => {
  it('prefers the handle', () => {
    expect(inviterLine('josetravels', 'Jose Rivera', inHours(-48), NOW)).toBe(
      'Invited by @josetravels · 2d ago',
    );
  });

  it('falls back to the display name when there is no handle', () => {
    expect(inviterLine(null, 'Jose Rivera', inHours(-2), NOW)).toBe(
      'Invited by Jose Rivera · 2h ago',
    );
  });

  it('never renders an empty name', () => {
    expect(inviterLine(null, '', inHours(-2), NOW)).toBe('Invited by A traveler · 2h ago');
  });

  it('reads fresh invitations as just now', () => {
    expect(invitedAgoLabel(inHours(-0.2), NOW)).toBe('just now');
  });

  it('counts in days up to a week', () => {
    expect(invitedAgoLabel(inHours(-24), NOW)).toBe('1d ago');
    expect(invitedAgoLabel(inHours(-24 * 6), NOW)).toBe('6d ago');
  });

  it('counts in weeks past that, which the requests list draws', () => {
    expect(invitedAgoLabel(inHours(-24 * 7), NOW)).toBe('1w ago');
    expect(invitedAgoLabel(inHours(-24 * 13), NOW)).toBe('1w ago');
    expect(invitedAgoLabel(inHours(-24 * 14), NOW)).toBe('2w ago');
  });
});

describe('the trip meta line', () => {
  it('joins destination and dates', () => {
    expect(tripMetaLine('El Nido', '2026-03-12', '2026-03-18')).toBe('El Nido · Mar 12–18');
  });

  it('spells the second month when a trip crosses one', () => {
    expect(compactDateRange('2026-03-28', '2026-04-03')).toBe('Mar 28–Apr 3');
  });

  it('drops what it does not have rather than rendering a stray separator', () => {
    expect(tripMetaLine('El Nido', null, null)).toBe('El Nido');
    expect(tripMetaLine(null, '2026-03-12', '2026-03-18')).toBe('Mar 12–18');
    expect(tripMetaLine(null, null, null)).toBeNull();
  });

  it('shows a single date when the trip has no end', () => {
    expect(compactDateRange('2026-03-12', null)).toBe('Mar 12');
  });
});
