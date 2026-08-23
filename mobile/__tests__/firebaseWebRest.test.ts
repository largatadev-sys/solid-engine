import type { AuthUser } from '../src/repositories/authContract';


const STORAGE_KEY = 'largata.web.session';


function installLocalStorageStub(): void {
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, String(value)),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    },
  });
}

const API_KEY = 'test-api-key';

interface FetchCall {
  url: string;
  body: Record<string, unknown>;
}

function mockFetchOnce(response: Record<string, unknown>, ok = true): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue({
    ok,
    json: async () => response,
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function lastCall(fetchMock: jest.Mock): FetchCall {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url: String(url), body: JSON.parse(String((init as RequestInit).body)) };
}


const AUTH_RESPONSE = {
  idToken: 'firebase-id-token',
  refreshToken: 'firebase-refresh-token',
  localId: 'firebase-uid-123',
  expiresIn: '3600',
};

beforeEach(() => {
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY = API_KEY;
  installLocalStorageStub();
  jest.resetModules();
});

describe('signInWithIdp — the Google doorway (S0.6)', () => {
  it('posts the Google ID token to accounts:signInWithIdp as a Google credential', async () => {
    const fetchMock = mockFetchOnce(AUTH_RESPONSE);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rest = require('../src/auth/firebaseWebRest');
    await rest.signInWithGoogleIdToken('google-id-token', 'https://founders.largata.com');

    const { url, body } = lastCall(fetchMock);

    expect(url).toContain('identitytoolkit.googleapis.com/v1/accounts:signInWithIdp');
    expect(url).toContain(`key=${API_KEY}`);

    expect(String(body.postBody)).toContain('id_token=google-id-token');
    expect(String(body.postBody)).toContain('providerId=google.com');
    expect(body.returnSecureToken).toBe(true);
    expect(body.requestUri).toBe('https://founders.largata.com');
  });

  it('stores the session exactly as password sign-in does', async () => {
    const before = Date.now();

    mockFetchOnce(AUTH_RESPONSE);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const viaGoogle = require('../src/auth/firebaseWebRest');
    await viaGoogle.signInWithGoogleIdToken('google-id-token', 'https://x.test');
    const googleSession = JSON.parse(String(window.localStorage.getItem(STORAGE_KEY)));

    installLocalStorageStub();
    jest.resetModules();

    mockFetchOnce(AUTH_RESPONSE);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const viaPassword = require('../src/auth/firebaseWebRest');
    await viaPassword.signInWithPassword('ana@example.com', 'hunter2!');
    const passwordSession = JSON.parse(String(window.localStorage.getItem(STORAGE_KEY)));

    expect(Object.keys(googleSession).sort()).toEqual(Object.keys(passwordSession).sort());

    const { expiresAt: googleExpiry, ...googleRest } = googleSession;
    const { expiresAt: passwordExpiry, ...passwordRest } = passwordSession;
    expect(googleRest).toEqual(passwordRest);

    expect(googleExpiry).toBeGreaterThanOrEqual(before + 3600 * 1000);
    expect(googleExpiry).toBeLessThanOrEqual(Date.now() + 3600 * 1000);
    expect(Math.abs(googleExpiry - passwordExpiry)).toBeLessThan(1000);
  });

  it('notifies auth-state listeners so the router routes (routing is not a round-trip)', async () => {
    mockFetchOnce(AUTH_RESPONSE);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rest = require('../src/auth/firebaseWebRest');

    const seen: (string | null)[] = [];
    rest.subscribe((user: { uid: string } | null) => seen.push(user === null ? null : user.uid));

    await rest.signInWithGoogleIdToken('google-id-token', 'https://x.test');

    expect(seen).toEqual([null, 'firebase-uid-123']);
  });

  it('hands the cache the same viewer change a password sign-in does, so the invite postcard reprices', async () => {
    mockFetchOnce(AUTH_RESPONSE);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rest = require('../src/auth/firebaseWebRest');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { authStateOf, viewerChanged } = require('../src/query/viewerScopedCache');

    const seen: (AuthUser | null)[] = [];
    rest.subscribe((user: AuthUser | null) => seen.push(user));

    await rest.signInWithGoogleIdToken('google-id-token', 'https://x.test');

    const [first, second] = seen;
    expect(seen).toHaveLength(2);
    expect(viewerChanged(authStateOf(first ?? null), authStateOf(second ?? null))).toBe(true);
  });

  it('translates an IdP failure into the shared auth error vocabulary', async () => {
    mockFetchOnce({ error: { message: 'INVALID_IDP_RESPONSE' } }, false);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rest = require('../src/auth/firebaseWebRest');

    const error = await rest
      .signInWithGoogleIdToken('bad-token', 'https://x.test')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error & { code: string }).code).toMatch(/^auth\//);
  });
});
