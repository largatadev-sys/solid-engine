import { healthRepository } from '../src/repositories/healthRepository';

/**
 * The repository layer (ADR-001). No cache until S0.3 picks the technology — these tests pin the
 * read-through contract so that swap stays a one-file change.
 */

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const okResponse = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('healthRepository', () => {
  it('reads through to the API and returns the result', async () => {
    mockFetch.mockResolvedValue(okResponse({ status: 'ok' }));

    await expect(healthRepository.fetchHealth()).resolves.toEqual({ status: 'ok' });
  });

  it('propagates ApiError rather than swallowing it', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));

    await expect(healthRepository.fetchHealth()).rejects.toMatchObject({
      code: 'NETWORK_UNAVAILABLE',
    });
  });
});
