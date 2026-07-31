import { invitationRepository } from '../src/repositories/invitationRepository';
import { travelerRepository } from '../src/repositories/travelerRepository';



jest.mock('../src/api/apiClient', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const { apiClient } = jest.requireMock('../src/api/apiClient') as {
  apiClient: { get: jest.Mock; post: jest.Mock; patch: jest.Mock; put: jest.Mock; delete: jest.Mock };
};

const TRIP = 'it-1';

beforeEach(() => {
  jest.clearAllMocks();
  apiClient.get.mockResolvedValue({});
  apiClient.post.mockResolvedValue({});
});

describe('the handle lookup (ADR-015 first consumer, exact match only)', () => {
  it('reads one traveler by their exact handle', async () => {
    await travelerRepository.findByHandle('largata_dev_t2');

    expect(apiClient.get).toHaveBeenCalledWith('/v1/handles/largata_dev_t2');
  });

  it('escapes the handle rather than pasting it into the path', async () => {
    await travelerRepository.findByHandle('not a handle/../me');

    expect(apiClient.get).toHaveBeenCalledWith('/v1/handles/not%20a%20handle%2F..%2Fme');
  });

  it('is a different call from the availability check the onboarding step uses', async () => {
    await travelerRepository.findByHandle('anasilva');
    await travelerRepository.checkHandle('anasilva');

    expect(apiClient.get.mock.calls.map(([path]: [string]) => path)).toEqual([
      '/v1/handles/anasilva',
      '/v1/handles/anasilva/availability',
    ]);
  });
});

describe('inviting by handle', () => {
  it('posts the handle to the by-handle route, leaving the email route untouched', async () => {
    await invitationRepository.inviteByHandle(TRIP, { handle: 'largata_dev_t2' });

    expect(apiClient.post).toHaveBeenCalledWith(`/v1/itineraries/${TRIP}/invitations/by-handle`, {
      handle: 'largata_dev_t2',
    });
  });

  it('still sends an email invitation the way S1.2 shipped it', async () => {
    await invitationRepository.invite(TRIP, { email: 'friend@example.com' });

    expect(apiClient.post).toHaveBeenCalledWith(`/v1/itineraries/${TRIP}/invitations`, {
      email: 'friend@example.com',
    });
  });

  it('never carries an email on the handle path — the id is the address', async () => {
    await invitationRepository.inviteByHandle(TRIP, { handle: 'largata_dev_t2' });

    const [, body] = apiClient.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(Object.keys(body)).toEqual(['handle']);
  });
});
