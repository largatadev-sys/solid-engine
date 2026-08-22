import { inboxCards } from '../inboxOrder';

const invitation = (id: string, expiresAt: string) => ({ id, expiresAt });
const request = (id: string) => ({ id });

describe('what the Trips inbox shows, and in what order', () => {
  const NOW = Date.parse('2026-08-22T00:00:00Z');
  const LIVE = '2026-09-05T00:00:00Z';
  const DEAD = '2026-08-01T00:00:00Z';

  it('puts invitations before requests — the trip asking you outranks you asking it', () => {
    const cards = inboxCards({
      invitations: [invitation('i1', LIVE)],
      requests: [request('r1')],
      now: NOW,
    });

    expect(cards.map((c) => c.key)).toEqual(['invitation:i1', 'request:r1']);
  });

  it('drops an expired invitation, because a dead ask must render nowhere', () => {
    const cards = inboxCards({
      invitations: [invitation('gone', DEAD), invitation('live', LIVE)],
      requests: [],
      now: NOW,
    });

    expect(cards.map((c) => c.key)).toEqual(['invitation:live']);
  });

  it('keeps every request, because a request has no expiry to judge it by', () => {
    const cards = inboxCards({
      invitations: [],
      requests: [request('r1'), request('r2')],
      now: NOW,
    });

    expect(cards.map((c) => c.key)).toEqual(['request:r1', 'request:r2']);
  });

  it('renders nothing when the traveler is neither asked nor asking', () => {
    expect(inboxCards({ invitations: [], requests: [], now: NOW })).toEqual([]);
  });

  it('survives an expired invitation sitting beside a live request', () => {
    const cards = inboxCards({
      invitations: [invitation('gone', DEAD)],
      requests: [request('r1')],
      now: NOW,
    });

    expect(cards.map((c) => c.key)).toEqual(['request:r1']);
  });
});
