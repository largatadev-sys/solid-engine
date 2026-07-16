import { itineraryRepository } from '../src/repositories/itineraryRepository';

/**
 * The itinerary repository (S0.3, ticket 06) — mocked at the apiClient boundary, the same seam
 * `healthRepository.test.ts` mocks (S0.1 convention).
 */

jest.mock('../src/api/apiClient', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const { apiClient } = jest.requireMock('../src/api/apiClient') as {
  apiClient: { get: jest.Mock; post: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('reading the list', () => {
  it('asks for the first page with no cursor at all', async () => {
    apiClient.get.mockResolvedValue({ items: [] });

    await itineraryRepository.fetchMine();

    // Not "?cursor=undefined" — the server would try to decode that string and answer 400.
    expect(apiClient.get).toHaveBeenCalledWith('/v1/itineraries');
  });

  it('passes a cursor back exactly as it was handed one', async () => {
    apiClient.get.mockResolvedValue({ items: [] });

    await itineraryRepository.fetchMine('MDE5-abc');

    expect(apiClient.get).toHaveBeenCalledWith('/v1/itineraries?cursor=MDE5-abc');
  });

  it('escapes a cursor rather than trusting its characters', async () => {
    // The cursor is opaque (Artifact 05): this layer must not assume base64url stays URL-safe, or
    // the day the server's cursor changes shape, pages silently start 400ing.
    apiClient.get.mockResolvedValue({ items: [] });

    await itineraryRepository.fetchMine('a+b/c=');

    expect(apiClient.get).toHaveBeenCalledWith('/v1/itineraries?cursor=a%2Bb%2Fc%3D');
  });
});

describe('reading one and creating', () => {
  it('fetches a single itinerary by id', async () => {
    apiClient.get.mockResolvedValue({ id: 'abc' });

    await itineraryRepository.fetchOne('abc');

    expect(apiClient.get).toHaveBeenCalledWith('/v1/itineraries/abc');
  });

  it('posts the create request as the API contract spells it', async () => {
    apiClient.post.mockResolvedValue({ id: 'abc' });
    const request = { title: 'Lisbon', destinations: ['Lisbon'] };

    await itineraryRepository.create(request);

    expect(apiClient.post).toHaveBeenCalledWith('/v1/itineraries', request);
  });
});
