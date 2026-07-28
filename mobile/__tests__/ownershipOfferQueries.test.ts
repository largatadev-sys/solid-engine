import { QueryClient } from '@tanstack/react-query';
import {
  invitationKeys,
  onOwnershipOfferChanged,
  onOwnershipTransferred,
} from '../src/query/invitationQueries';
import { itineraryKeys } from '../src/query/itineraryQueries';

/**
 * The ownership-offer cache contract (S1.6, ticket 04) — driven through a real QueryClient, no
 * renderer, the `departureQueries.test.ts` shape.
 *
 * <p>The decision worth pinning is the width difference. Making, withdrawing or refusing an offer
 * changes one thing: the roster's flag. <strong>Accepting changes who owns the trip</strong>, so the
 * cached itinerary (its owner, and anything gated on it) and the list (both parties keep the trip, but
 * their standing changed) are stale too. Invalidate, never remove — unlike leaving, nothing became
 * unreadable; it became wrong.
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
    offerOwnership: jest.fn(),
    revokeOwnershipOffer: jest.fn(),
    acceptOwnershipOffer: jest.fn(),
    declineOwnershipOffer: jest.fn(),
  },
}));

const TRIP = 'it-1';

function seededClient(): QueryClient {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(itineraryKeys.one(TRIP), { id: TRIP, title: 'Portugal 26' });
  client.setQueryData(itineraryKeys.list(), { pages: [], pageParams: [] });
  client.setQueryData(invitationKeys.members(TRIP), { items: [] });
  return client;
}

describe('after an offer is made, withdrawn or declined', () => {
  it('refreshes the roster, because that is where the flag lives', async () => {
    const client = seededClient();

    await onOwnershipOfferChanged(client, TRIP);

    expect(client.getQueryState(invitationKeys.members(TRIP))?.isInvalidated).toBe(true);
  });

  it('leaves the trip and the list alone — nothing about ownership actually moved', async () => {
    const client = seededClient();

    await onOwnershipOfferChanged(client, TRIP);

    expect(client.getQueryState(itineraryKeys.one(TRIP))?.isInvalidated).toBe(false);
    expect(client.getQueryState(itineraryKeys.list())?.isInvalidated).toBe(false);
  });
});

describe('after an offer is accepted', () => {
  it('refreshes the roster, the trip and the list — the crown moved', async () => {
    const client = seededClient();

    await onOwnershipTransferred(client, TRIP);

    expect(client.getQueryState(invitationKeys.members(TRIP))?.isInvalidated).toBe(true);
    expect(client.getQueryState(itineraryKeys.one(TRIP))?.isInvalidated).toBe(true);
    expect(client.getQueryState(itineraryKeys.list())?.isInvalidated).toBe(true);
  });

  it('keeps the cached trip readable — a transfer changes who owns it, not whether you may see it', async () => {
    // Contrast leaving, which *removes* these entries because every refetch would 404. Both parties
    // remain members through a transfer, so removing would blank a screen that is still entitled to
    // its data and force a spinner for no reason.
    const client = seededClient();

    await onOwnershipTransferred(client, TRIP);

    expect(client.getQueryData(itineraryKeys.one(TRIP))).toEqual({ id: TRIP, title: 'Portugal 26' });
  });
});

