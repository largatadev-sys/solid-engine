/**
 * The web preview's Identity Toolkit gateway (S0.4), and the Google doorway added to it at S0.6.
 *
 * <p><strong>What these defend.</strong> `signInWithIdp` is a new *entry* into a module whose
 * session plumbing — persistence, refresh, listeners — already existed and is shared with
 * `signInWithPassword`. The bug this class of change invites is a doorway that authenticates but
 * stores its session slightly differently, so a founder is signed in until the first refresh. The
 * assertions therefore compare the two doorways' *outcomes* rather than testing the new one alone.
 *
 * <p>`fetch` is mocked at the global, which is the module's only dependency: it imports nothing from
 * `firebase/*` (the S0.4 REST pivot), so there is no SDK to stub and no bundler behaviour to fake.
 *
 * <p><strong>Why `localStorage` is stubbed here rather than switching presets.</strong> These suites
 * run under jest-expo's native preset, whose `window` has no `localStorage` — and the "proper" fix,
 * a web-preset project, is the multi-project Jest config S0.5 weighed and deferred (its ticket 01:
 * "a test-infrastructure decision far larger than the feature it would serve"). That call still
 * holds; it belongs to the web-surface story. Stubbing the module's one browser dependency buys the
 * same assertions for a few lines. <strong>The honest limit:</strong> this proves the module's
 * logic, never that a real browser agrees — the preview-container run is what proves the browser
 * (S0.6 ticket 03, and the standing "verify at the layer that ships" rule).
 */

const STORAGE_KEY = 'largata.web.session';

/** A minimal localStorage: the native preset's `window` has none, and this module persists to it. */
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

// The module reads EXPO_PUBLIC_FIREBASE_API_KEY at import time (direct static access — the S0.4
// inlining rule), so it must be set before the first require in every isolated-module block.
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

/** A successful Identity Toolkit auth response — the shape both doorways receive. */
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

    // The endpoint and the key= param: a wrong endpoint fails loudly, but a missing key fails as a
    // 400 that reads like a bad credential (S0.4's inlining gotcha shipped exactly that).
    expect(url).toContain('identitytoolkit.googleapis.com/v1/accounts:signInWithIdp');
    expect(url).toContain(`key=${API_KEY}`);

    // postBody is form-encoded *inside* a JSON field — an Identity Toolkit quirk worth pinning: the
    // providerId must accompany the token or Google cannot tell which IdP minted it.
    expect(String(body.postBody)).toContain('id_token=google-id-token');
    expect(String(body.postBody)).toContain('providerId=google.com');
    expect(body.returnSecureToken).toBe(true);
    // requestUri must match an authorized origin; Firebase rejects the exchange otherwise.
    expect(body.requestUri).toBe('https://founders.largata.com');
  });

  it('stores the session exactly as password sign-in does', async () => {
    // The load-bearing assertion of this story: a doorway that authenticates but persists a
    // different session shape would sign the founder in until the first token refresh, then drop
    // them — a failure that looks like "the preview randomly signs me out".
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

    // Identical keys: a doorway that stored, say, no refreshToken would pass every other test here
    // and strand the founder an hour later.
    expect(Object.keys(googleSession).sort()).toEqual(Object.keys(passwordSession).sort());

    // Identical values for everything the response determines.
    const { expiresAt: googleExpiry, ...googleRest } = googleSession;
    const { expiresAt: passwordExpiry, ...passwordRest } = passwordSession;
    expect(googleRest).toEqual(passwordRest);

    // expiresAt is `Date.now() + expiresIn` — two real clock reads, so the two doorways' values
    // differ by however long the test took. Asserting equality would be asserting the clock stood
    // still (it did not: the first run of this test failed by 2ms). What matters is that Google's
    // expiry is derived the same way from the same response: an hour out, from a real read.
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

    // Fires null immediately (signed out), then the uid — the contract AuthProvider is written to.
    expect(seen).toEqual([null, 'firebase-uid-123']);
  });

  it('translates an IdP failure into the shared auth error vocabulary', async () => {
    // Screens never see Identity Toolkit's machine codes; the shared translate() turns a `.code`
    // into a deliberately vague sentence. An untranslated raw error here would leak REST vocabulary
    // into the UI — the boundary ADR-001 exists to hold.
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
