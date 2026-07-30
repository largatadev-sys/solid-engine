import { travelerRepository } from '../src/repositories/travelerRepository';
import { verificationRepository } from '../src/repositories/verificationRepository';



jest.mock('../src/api/apiClient', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const { apiClient } = jest.requireMock('../src/api/apiClient') as {
  apiClient: { get: jest.Mock; post: jest.Mock; patch: jest.Mock; put: jest.Mock; delete: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
  apiClient.get.mockResolvedValue({});
  apiClient.post.mockResolvedValue({});
  apiClient.patch.mockResolvedValue({});
});

describe('the profile endpoints', () => {
  it('reads the traveler from the shipped /v1/me', async () => {
    await travelerRepository.fetchMe();

    expect(apiClient.get).toHaveBeenCalledWith('/v1/me');
  });

  it('writes a profile as a PATCH carrying only the fields it was given', async () => {
    await travelerRepository.updateProfile({ handle: 'anasilva' });

    expect(apiClient.patch).toHaveBeenCalledWith('/v1/me', { handle: 'anasilva' });
  });

  it('completes onboarding through its own endpoint, not by patching a flag', async () => {
    await travelerRepository.completeOnboarding();

    expect(apiClient.post).toHaveBeenCalledWith('/v1/me/onboarding-completion', {});
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('checks a handle by asking about that handle', async () => {
    await travelerRepository.checkHandle('anasilva');

    expect(apiClient.get).toHaveBeenCalledWith('/v1/handles/anasilva/availability');
  });

  it('escapes a handle rather than trusting its characters into the path', async () => {
    await travelerRepository.checkHandle('a/b c');

    expect(apiClient.get).toHaveBeenCalledWith('/v1/handles/a%2Fb%20c/availability');
  });
});

describe('the verification endpoints', () => {
  it('asks for a code by creating one', async () => {
    await verificationRepository.sendCode();

    expect(apiClient.post).toHaveBeenCalledWith('/v1/verification-codes', {});
  });

  it('submits the code to the confirm endpoint', async () => {
    await verificationRepository.confirmCode('004242');

    expect(apiClient.post).toHaveBeenCalledWith('/v1/verification-codes/confirm', {
      code: '004242',
    });
  });

  it('never sends the code anywhere but the confirm call', async () => {
    await verificationRepository.confirmCode('004242');

    const calls = apiClient.post.mock.calls.filter(([path]) => path !== '/v1/verification-codes/confirm');

    expect(calls).toEqual([]);
  });
});
