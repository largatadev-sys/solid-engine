/**
 * Google Identity Services — the browser's Google credential source (S0.6).
 *
 * <p><strong>Why a CDN script is not a return to the banned SDK.</strong> S0.4 banned `firebase/*`
 * imports from the web bundle: the JS SDK registers its auth component through an import side effect
 * Metro tree-shakes away, so `getAuth` had nothing to initialize and the preview white-screened.
 * That failure is a *bundler* failure — it needs a module graph to go wrong in. GIS is a `<script>`
 * tag fetched at runtime and never enters the graph, so there is nothing for Metro to shake and no
 * registration to lose. Different mechanism, different failure modes. (The one it *does* have: the
 * CDN can be blocked, which is why `load()` rejects instead of hanging.)
 *
 * <p><strong>Button-only, deliberately (S0.6).</strong> GIS also offers One Tap — an overlay that
 * appears uninvited on page load and can silently auto-select a returning user. It is not enabled
 * here: `prompt()` is never called and `auto_select` is false. The preview must stay a subset of the
 * app it previews, and the app has no such thing.
 *
 * <p><strong>Web only.</strong> Nothing imports this on native — the platform fork keeps it inside
 * `.web` files. Native's Google doorway is the account picker in `authRepository.native.ts`.
 */

/** GIS's global, typed to exactly the surface we use — not a vendored copy of its whole API. */
interface GoogleIdentityGlobal {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
        auto_select: boolean;
        cancel_on_tap_outside: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: { theme: string; size: string; text: string; shape: string; width?: number },
      ) => void;
    };
  };
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';

/** Called with the Google ID token when a founder completes the account chooser. */
type CredentialListener = (idToken: string) => void;

let clientId: string | null = null;
let loading: Promise<GoogleIdentityGlobal> | null = null;

// The newest render's callback. GIS's `initialize` holds one callback per page, so a remount must
// replace it — a stale closure would swallow the credential and the click would do nothing.
let listener: CredentialListener | null = null;

/**
 * Retains the OAuth client id. Called by the web repository's `configureGoogleSignIn` at startup,
 * mirroring native's `GoogleSignin.configure()` — same seam, same moment, different SDK.
 */
export function configure(webClientId: string): void {
  clientId = webClientId;
}

function google(): GoogleIdentityGlobal | undefined {
  return (globalThis as unknown as { google?: GoogleIdentityGlobal }).google;
}

/**
 * Loads and initializes GIS, once. Concurrent callers share the same promise — three components
 * asking at once must not mean three script tags, since each load re-registers the globals and the
 * last one silently wins.
 */
export function load(): Promise<GoogleIdentityGlobal> {
  if (loading !== null) return loading;

  loading = new Promise<GoogleIdentityGlobal>((resolve, reject) => {
    if (clientId === null || clientId === '') {
      // Loud and early, matching native's stance (S0.2): a build with no client id should say so,
      // not look fine until the first click fails at the token exchange with nothing naming why.
      reject(
        new Error(
          'Google sign-in has no client id. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID — see mobile/.env.example.',
        ),
      );
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    // async: the sign-in screen must paint before Google's CDN answers. A render-blocking script
    // here would mean a founder stares at nothing while a third party is slow.
    script.async = true;
    script.defer = true;

    script.onload = () => {
      const gis = google();
      if (gis === undefined) {
        reject(new Error('Google sign-in failed to load. Check your connection and try again.'));
        return;
      }

      gis.accounts.id.initialize({
        client_id: clientId as string,
        // One callback for the page's lifetime; `listener` is the indirection that lets a remount
        // redirect it without re-initializing GIS.
        callback: (response) => listener?.(response.credential),
        // Both false are the "no One Tap" decision, made mechanical (S0.6 scope boundary).
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      resolve(gis);
    };

    script.onerror = () => {
      // Reset so a later attempt can retry: a founder behind a blocked CDN who fixes it should not
      // have to reload the page.
      loading = null;
      reject(new Error('Google sign-in failed to load. Check your connection and try again.'));
    };

    document.head.appendChild(script);
  });

  return loading;
}

/**
 * Renders Google's official button into `host` and routes its credential to `onCredential`.
 *
 * <p>The caller owns what happens next (the exchange, the busy state, the error) — this module's
 * job ends at handing over the token. Note the shape: GIS owns the click, so the credential arrives
 * by callback rather than from an awaited promise. That inversion is why the button component, not
 * the screen's `onPress`, drives the busy indicator on web.
 */
export async function renderButton(
  host: HTMLElement,
  onCredential: CredentialListener,
  width?: number,
): Promise<void> {
  const gis = await load();
  listener = onCredential;

  gis.accounts.id.renderButton(host, {
    // Chosen to match what `GoogleSignInButton.native.tsx` draws — flat, pill, "Continue with
    // Google" — because the founder's ruling is that the two surfaces look like one product. If one
    // of these changes, the other has to.
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    // Without a width GIS sizes to its label and floats, narrower than the form beneath it. GIS
    // caps this at 400px and ignores anything larger, which is why the screen's field width (420)
    // cannot simply be passed through and the button is not *exactly* form-width on web.
    ...(width === undefined ? {} : { width: Math.min(width, 400) }),
  });
}

/** Test seam: module state is a singleton by design, and suites need it back to zero. */
export function resetForTests(): void {
  clientId = null;
  loading = null;
  listener = null;
}
