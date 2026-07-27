import { QueryClient } from '@tanstack/react-query';
import { invitationKeys, onMembershipEnded } from '../src/query/invitationQueries';
import { itineraryKeys } from '../src/query/itineraryQueries';

/**
 * The departure cache contract (S1.5, ticket 02) — driven through a real QueryClient, no renderer, the
 * `invitationQueries.test.ts` shape.
 *
 * The decision worth pinning is the asymmetry: removing somebody else *invalidates* the roster, while
 * leaving *removes* every cached answer about the trip. Invalidation would leave the plan renderable
 * from cache on a screen still mounted, with every refetch 404ing behind it — data on screen that the
 * server has already refused to serve again.
 */

jest.mock('../src/repositories/invitationRepository', () => ({
  invitationRepository: {
    fetchInbox: jest.fn(),
    accept: jest.fn(),
    decline: jest.fn(),
    revoke: jest.fn(),
    fetchMembers: jest.fn(),
    fetchPendingInvitations: jest.fn(),
    invite: jest.fn(),
    endMembership: jest.fn(),
  },
}));

const TRIP = 'it-1';

function seededClient(): QueryClient {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(itineraryKeys.one(TRIP), { id: TRIP, title: 'Portugal 26' });
  client.setQueryData(itineraryKeys.list(), { pages: [], pageParams: [] });
  client.setQueryData(invitationKeys.members(TRIP), { items: [] });
  client.setQueryData(invitationKeys.pending(TRIP), { items: [] });
  return client;
}

describe('after removing another member', () => {
  it('refreshes the roster', async () => {
    const client = seededClient();

    await onMembershipEnded(client, TRIP, false);

    expect(client.getQueryState(invitationKeys.members(TRIP))?.isInvalidated).toBe(true);
  });

  it('leaves the trip itself alone — the plan did not change', async () => {
    // The owner pruning a member must not blank their own screen. Only the roster moved.
    const client = seededClient();

    await onMembershipEnded(client, TRIP, false);

    expect(client.getQueryData(itineraryKeys.one(TRIP))).toBeDefined();
    expect(client.getQueryState(itineraryKeys.list())?.isInvalidated).toBe(false);
  });
});

describe('after leaving', () => {
  it('drops every cached answer about the trip, rather than merely marking them stale', async () => {
    const client = seededClient();

    await onMembershipEnded(client, TRIP, true);

    expect(client.getQueryData(itineraryKeys.one(TRIP))).toBeUndefined();
    expect(client.getQueryData(invitationKeys.members(TRIP))).toBeUndefined();
    expect(client.getQueryData(invitationKeys.pending(TRIP))).toBeUndefined();
  });

  it('marks My Trips stale — which is currently a no-op, and the comment says why', async () => {
    // Deliberately NOT asserted as "the trip disappears from the list": it cannot, today. `GET
    // /v1/itineraries` is owner-scoped, and a leaver is always a member (the owner cannot leave), so
    // the trip was never in their list to drop (found at S1.5's device walk; epic-map backlog line).
    // What this pins is only that the invalidation is issued — correct the day the list becomes
    // membership-scoped, and honest about proving nothing more until then.
    const client = seededClient();

    await onMembershipEnded(client, TRIP, true);

    expect(client.getQueryState(itineraryKeys.list())?.isInvalidated).toBe(true);
  });

  it('touches nothing belonging to another trip', async () => {
    // Guards the obvious catastrophe: a departure that clears the cache broadly would log a traveler
    // out of every trip they are still in, and it would look like a sync bug rather than this.
    const client = seededClient();
    const otherTrip = 'it-2';
    client.setQueryData(itineraryKeys.one(otherTrip), { id: otherTrip, title: 'Japan 27' });
    client.setQueryData(invitationKeys.members(otherTrip), { items: [] });

    await onMembershipEnded(client, TRIP, true);

    expect(client.getQueryData(itineraryKeys.one(otherTrip))).toBeDefined();
    expect(client.getQueryData(invitationKeys.members(otherTrip))).toBeDefined();
  });
});
