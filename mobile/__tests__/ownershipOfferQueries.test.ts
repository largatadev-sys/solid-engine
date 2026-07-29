import { QueryClient } from '@tanstack/react-query';
import {
  invitationKeys,
  onOwnershipOfferChanged,
  onOwnershipTransferred,
} from '../src/query/invitationQueries';
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
    const client = seededClient();

    await onOwnershipTransferred(client, TRIP);

    expect(client.getQueryData(itineraryKeys.one(TRIP))).toEqual({ id: TRIP, title: 'Portugal 26' });
  });
});

