import { QueryClient } from '@tanstack/react-query';
import { invitationKeys, onMembershipEnded } from '../src/query/invitationQueries';
import { itineraryKeys } from '../src/query/itineraryQueries';



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
    const client = seededClient();

    await onMembershipEnded(client, TRIP, true);

    expect(client.getQueryState(itineraryKeys.list())?.isInvalidated).toBe(true);
  });

  it('touches nothing belonging to another trip', async () => {
    const client = seededClient();
    const otherTrip = 'it-2';
    client.setQueryData(itineraryKeys.one(otherTrip), { id: otherTrip, title: 'Japan 27' });
    client.setQueryData(invitationKeys.members(otherTrip), { items: [] });

    await onMembershipEnded(client, TRIP, true);

    expect(client.getQueryData(itineraryKeys.one(otherTrip))).toBeDefined();
    expect(client.getQueryData(invitationKeys.members(otherTrip))).toBeDefined();
  });
});
