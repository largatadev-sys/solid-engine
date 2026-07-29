import { QueryClient } from '@tanstack/react-query';
import { itineraryKeys } from '../src/query/itineraryQueries';
import {
  inboxOptions,
  invitationKeys,
  onInvitationAccepted,
} from '../src/query/invitationQueries';
import type { InboxInvitationResponse } from '../src/types/api';



jest.mock('../src/repositories/invitationRepository', () => ({
  invitationRepository: {
    fetchInbox: jest.fn(),
    accept: jest.fn(),
    decline: jest.fn(),
    revoke: jest.fn(),
    fetchMembers: jest.fn(),
    fetchPendingInvitations: jest.fn(),
    invite: jest.fn(),
  },
}));

const { invitationRepository } = jest.requireMock('../src/repositories/invitationRepository') as {
  invitationRepository: { fetchInbox: jest.Mock };
};

const invite = (id: string, tripTitle: string): InboxInvitationResponse => ({
  id,
  itineraryId: 'it-1',
  tripTitle,
  inviterName: 'Ana',
  createdAt: '2026-07-20T00:00:00Z',
  expiresAt: '2026-08-03T00:00:00Z',
});

function freshClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('the inbox', () => {
  it('fetches pending invitations for the caller', async () => {
    invitationRepository.fetchInbox.mockResolvedValue({ items: [invite('1', 'Portugal 26')] });

    const data = await freshClient().fetchQuery(inboxOptions);

    expect(invitationRepository.fetchInbox).toHaveBeenCalled();
    expect(data.items[0]?.tripTitle).toBe('Portugal 26');
  });
});

describe('after accepting', () => {
  it('invalidates BOTH the inbox and the trip list', async () => {
    const client = freshClient();
    invitationRepository.fetchInbox.mockResolvedValue({ items: [invite('1', 'Portugal 26')] });
    await client.fetchQuery(inboxOptions);
    client.setQueryData(itineraryKeys.list(), { pages: [], pageParams: [] });
    expect(client.getQueryState(invitationKeys.inbox())?.isInvalidated).toBe(false);
    expect(client.getQueryState(itineraryKeys.list())?.isInvalidated).toBe(false);

    await onInvitationAccepted(client);

    expect(client.getQueryState(invitationKeys.inbox())?.isInvalidated).toBe(true);
    expect(client.getQueryState(itineraryKeys.list())?.isInvalidated).toBe(true);
  });
});

describe('the keys', () => {
  it('scope members and pending lists by itinerary', () => {
    expect(invitationKeys.members('a')).not.toEqual(invitationKeys.members('b'));
    expect(invitationKeys.pending('a')).not.toEqual(invitationKeys.pending('b'));
  });
});
