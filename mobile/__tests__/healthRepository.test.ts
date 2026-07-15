import { healthRepository } from '../src/repositories/healthRepository';

/**
 * The repository layer (ADR-001). The cache is an in-memory pass-through until S0.3 picks the
 * real technology — these tests pin the *contract* so that swap stays a one-file change.
 */

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const okResponse = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

beforeEach(() => {
  mockFetch.mockReset();
  healthRepository.reset();
});

describe('healthRepository', () => {
  it('reads through to the API and returns the result', async () => {
    mockFetch.mockResolvedValue(okResponse({ status: 'ok' }));

    await expect(healthRepository.fetchHealth()).resolves.toEqual({ status: 'ok' });
  });

  it('has nothing cached before the first read', () => {
    expect(healthRepository.cached()).toBeUndefined();
  });

  it('caches what it last saw', async () => {
    mockFetch.mockResolvedValue(okResponse({ status: 'ok' }));

    await healthRepository.fetchHealth();

    expect(healthRepository.cached()).toEqual({ status: 'ok' });
  });

  it('propagates ApiError rather than swallowing it', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));

    await expect(healthRepository.fetchHealth()).rejects.toMatchObject({
      code: 'NETWORK_UNAVAILABLE',
    });
  });
});
