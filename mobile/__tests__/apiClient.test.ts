import { ApiError } from '../src/api/ApiError';
import { apiClient } from '../src/api/apiClient';

/**
 * The apiClient's contract (06b §7 "boundary-call unit"): it returns typed data or throws exactly
 * one error type. Everything above it depends on that being true.
 */

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const jsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('apiClient', () => {
  it('returns typed data on success', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { status: 'ok' }));

    await expect(apiClient.get<{ status: string }>('/v1/health')).resolves.toEqual({ status: 'ok' });
  });

  it('translates the error envelope into ApiError, preserving code and traceId', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(503, {
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'The service is temporarily unavailable.',
        traceId: 'trace-abc',
        timestamp: '2026-07-15T00:00:00Z',
      }),
    );

    // The UI branches on `code`; losing it in translation would force branching on `message`,
    // which Artifact 05 forbids.
    await expect(apiClient.get('/v1/health')).rejects.toMatchObject({
      code: 'DEPENDENCY_UNAVAILABLE',
      status: 503,
      traceId: 'trace-abc',
    });
  });

  it('throws ApiError, never a raw fetch rejection, when the network is unreachable', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));

    const error = await apiClient.get('/v1/health').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('NETWORK_UNAVAILABLE');
  });

  it('handles a non-2xx that is not our envelope (proxy, captive portal)', async () => {
    mockFetch.mockResolvedValue(jsonResponse(502, '<html>Bad Gateway</html>'));

    await expect(apiClient.get('/v1/health')).rejects.toMatchObject({
      code: 'UNEXPECTED_RESPONSE',
      status: 502,
    });
  });

  it('calls the configured base URL', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { status: 'ok' }));

    await apiClient.get('/v1/health');

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/v1/health'), expect.anything());
  });

  it('patches with a JSON body and a Content-Type (S1.3)', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { id: 'day-1' }));

    await apiClient.patch('/v1/itineraries/t/days/d', { title: 'x' });

    const init = mockFetch.mock.calls[0]?.[1] as RequestInit & { headers: Record<string, string> };
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ title: 'x' }));
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('puts with a JSON body — a wholesale replace (S1.3, ticket 03)', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204, json: async () => undefined } as unknown as Response);

    await apiClient.put('/v1/itineraries/t/days/d/activities/order', { activityIds: ['a', 'b'] });

    const init = mockFetch.mock.calls[0]?.[1] as RequestInit & { headers: Record<string, string> };
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(JSON.stringify({ activityIds: ['a', 'b'] }));
  });

  it('deletes with NO body and NO Content-Type — a bodiless request never describes a payload (S1.3)', async () => {
    // A 204 with an empty body: json() rejects, request tolerates it, and delete resolves to undefined.
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => {
        throw new Error('no body');
      },
    } as unknown as Response);

    await expect(apiClient.delete('/v1/itineraries/t/days/d')).resolves.toBeUndefined();

    const init = mockFetch.mock.calls[0]?.[1] as RequestInit & { headers: Record<string, string> };
    expect(init.method).toBe('DELETE');
    // The bug this guards: sending `body: "undefined"` or a Content-Type for a payload that isn't there.
    expect(init.body).toBeUndefined();
    expect(init.headers['Content-Type']).toBeUndefined();
  });
});
