import { profileRepository } from '../src/repositories/profileRepository';


jest.mock('../src/api/apiClient', () => ({
  apiClient: { get: jest.fn() },
}));

const { apiClient } = jest.requireMock('../src/api/apiClient') as {
  apiClient: { get: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
  apiClient.get.mockResolvedValue({ items: [] });
});


describe('the profile showcase endpoints', () => {
  it('reads the two backed counts from the stats route', async () => {
    await profileRepository.fetchStats();

    expect(apiClient.get).toHaveBeenCalledWith('/v1/me/profile/stats');
  });

  it('asks for the first page of published itineraries without a cursor', async () => {
    await profileRepository.fetchPublished();

    expect(apiClient.get).toHaveBeenCalledWith('/v1/me/profile/published');
  });

  it('carries a cursor into the next page', async () => {
    await profileRepository.fetchPublished('cursor-2');

    expect(apiClient.get).toHaveBeenCalledWith('/v1/me/profile/published?cursor=cursor-2');
  });

  it('escapes a cursor rather than trusting its characters into the query', async () => {
    await profileRepository.fetchPublished('a/b c+d');

    expect(apiClient.get).toHaveBeenCalledWith('/v1/me/profile/published?cursor=a%2Fb%20c%2Bd');
  });

  it('reads only the caller-scoped routes — no traveler id ever enters the path', async () => {
    await profileRepository.fetchStats();
    await profileRepository.fetchPublished('cursor-2');

    for (const [path] of apiClient.get.mock.calls) {
      expect(path).toMatch(/^\/v1\/me\/profile\//);
    }
  });
});
