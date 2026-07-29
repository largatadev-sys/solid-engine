import { apiClient } from '../src/api/apiClient';
import { resetTokenSource, setTokenSource } from '../src/auth/tokenSource';



const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const jsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

const headersOfLastCall = (): Record<string, string> =>
  (mockFetch.mock.calls[0][1] as { headers: Record<string, string> }).headers;

beforeEach(() => {
  mockFetch.mockReset();
  resetTokenSource();
});

describe('apiClient token attach', () => {
  it('sends the bearer token when someone is signed in', async () => {
    setTokenSource(async () => 'firebase-id-token');
    mockFetch.mockResolvedValue(jsonResponse(200, { id: 'x', displayName: 'Ana', email: 'a@b.c' }));

    await apiClient.get('/v1/me');

    expect(headersOfLastCall().Authorization).toBe('Bearer firebase-id-token');
  });

  it('sends no Authorization header at all when signed out', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { status: 'ok' }));

    await apiClient.get('/v1/health');

    expect(headersOfLastCall()).not.toHaveProperty('Authorization');
  });

  it('asks the token source on every request, never caching the token itself', async () => {
    const tokens = ['token-1', 'token-2'];
    setTokenSource(async () => tokens.shift() ?? null);
    mockFetch.mockResolvedValue(jsonResponse(200, { status: 'ok' }));

    await apiClient.get('/v1/health');
    await apiClient.get('/v1/health');

    const authOf = (call: number): string | undefined =>
      (mockFetch.mock.calls[call][1] as { headers: Record<string, string> }).headers.Authorization;
    expect(authOf(0)).toBe('Bearer token-1');
    expect(authOf(1)).toBe('Bearer token-2');
  });

  it('surfaces the backend UNAUTHENTICATED envelope as a typed ApiError', async () => {
    setTokenSource(async () => 'expired-token');
    mockFetch.mockResolvedValue(
      jsonResponse(401, {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required.',
        traceId: 'trace-401',
        timestamp: '2026-07-15T00:00:00Z',
      }),
    );

    await expect(apiClient.get('/v1/me')).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      status: 401,
      traceId: 'trace-401',
    });
  });
});
