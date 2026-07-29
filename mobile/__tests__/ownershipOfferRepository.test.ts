import { invitationRepository } from '../src/repositories/invitationRepository';



jest.mock('../src/api/apiClient', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const { apiClient } = jest.requireMock('../src/api/apiClient') as {
  apiClient: { get: jest.Mock; post: jest.Mock; patch: jest.Mock; put: jest.Mock; delete: jest.Mock };
};

const TRIP = 'it-1';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('offering ownership', () => {
  it('posts the target traveler to the trip-addressed offer route', async () => {
    apiClient.post.mockResolvedValue(undefined);

    await invitationRepository.offerOwnership(TRIP, { travelerId: 'traveler-2' });

    expect(apiClient.post).toHaveBeenCalledWith(`/v1/itineraries/${TRIP}/ownership-offer`, {
      travelerId: 'traveler-2',
    });
  });
});

describe('resolving an offer', () => {
  it('revokes with a DELETE on the singleton — no id, and idempotent server-side', async () => {
    apiClient.delete.mockResolvedValue(undefined);

    await invitationRepository.revokeOwnershipOffer(TRIP);

    expect(apiClient.delete).toHaveBeenCalledWith(`/v1/itineraries/${TRIP}/ownership-offer`);
  });

  it('accepts with a bodyless POST — the path names the trip, the token names the caller', async () => {
    apiClient.post.mockResolvedValue(undefined);

    await invitationRepository.acceptOwnershipOffer(TRIP);

    expect(apiClient.post).toHaveBeenCalledWith(
      `/v1/itineraries/${TRIP}/ownership-offer/accept`,
      undefined,
    );
  });

  it('declines with a bodyless POST', async () => {
    apiClient.post.mockResolvedValue(undefined);

    await invitationRepository.declineOwnershipOffer(TRIP);

    expect(apiClient.post).toHaveBeenCalledWith(
      `/v1/itineraries/${TRIP}/ownership-offer/decline`,
      undefined,
    );
  });
});
