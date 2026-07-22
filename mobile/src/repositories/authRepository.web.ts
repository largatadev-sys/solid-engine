import {
  AuthError,
  translate,
  type AuthCapabilities,
  type AuthRepository,
  type AuthUser,
} from './authContract';
import {
  getValidIdToken,
  refreshVerification as refreshVerificationRest,
  resendVerification as resendVerificationRest,
  sendPasswordReset,
  signInWithGoogleIdToken,
  signInWithPassword,
  signOut as signOutRest,
  signUpWithPassword,
  subscribe,
} from '../auth/firebaseWebRest';
import { configure as configureGis } from '../auth/googleIdentityServices';

/**
 * The web twin of `authRepository.native.ts`, on Firebase's Identity Toolkit REST API rather than
 * the Firebase JS SDK.
 *
 * <p><strong>Why REST.</strong> The JS SDK's auth-component registration is a Metro-tree-shaken
 * import side effect that ships broken on web (white screen, "Component auth has not been registered
 * yet"); REST imports nothing from `firebase/*`, so there is nothing to register and nothing for the
 * bundler to drop. See `firebaseWebRest.ts` for the full account. The tokens are ordinary Firebase
 * ID tokens, so the backend contract (ADR-006) is unchanged.
 *
 * <p><strong>What this is, precisely (S0.6 sharpened it).</strong> The founders' preview
 * *deployment* is interim — dev-only, never promoted, deleted whole when the real web surface or
 * TestFlight arrives. <strong>This code is not.</strong> The real web surface is this same codebase
 * exported to web, so the doorway below is the permanent one it inherits; only the Railway service
 * around it is throwaway. It is written to that standard. (Read the S0.6 spec before deciding
 * otherwise — "interim" was ambiguous between deployment and code until that grilling separated
 * them.)
 *
 * <p><strong>What it still is not: the shipping app.</strong> That is the APK, whose doorway is
 * `.native.ts`. A green sign-in here is evidence about this file, not about the app — the S0.2
 * `getTokens()` bug was invisible to every browser and every unit test, and lived only on a device.
 *
 * <p><strong>Google works here since S0.6</strong> — `authCapabilities.google` is `'full'`. The
 * credential comes from Google Identity Services (`googleIdentityServices.ts`, a runtime CDN script,
 * not a bundled SDK) and is exchanged for a Firebase session at `accounts:signInWithIdp`. Same
 * Firebase project as native, so the same Google account yields the same UID and the same Traveler:
 * one identity, two doorways (ADR-006's point).
 */

/**
 * Wires GIS to our OAuth client — the web half of the install path (S0.6).
 *
 * <p>This export is what lets `_layout.tsx` call `installGoogleSignIn()` on web. It could not, until
 * this story: `googleSignInConfig.ts` imports `configureGoogleSignIn` from this platform-forked
 * module, and only `.native.ts` exported it — harmless while the `'full'` gate kept the call from
 * ever happening on web, and a startup crash the moment the flag flipped. Flipping the capability
 * without this function would have been the bug; the gate stays, what it gates forks.
 *
 * <p>Same client id as native (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`) and not by coincidence: Firebase
 * auto-created one *web* OAuth client for the project, native uses it for the token exchange, and
 * the browser uses it to obtain the credential in the first place. One client, one env var; the
 * browser origins are registered on it in the Google Cloud console (S0.6 spec).
 *
 * <p>Loading is deliberately not awaited here: startup must not block on Google's CDN. `load()` is
 * idempotent and the button awaits it, so the script is in flight by the time a founder can click.
 */
export function configureGoogleSignIn(webClientId: string): void {
  configureGis(webClientId);
}

/**
 * A working doorway since S0.6 (was `'cosmetic'`: the button rendered, nothing was behind it).
 *
 * `'full'` means *a* doorway exists — never *the native SDK's* doorway. `_layout.tsx` reads this to
 * decide whether to install anything, and what it installs now forks: the native Google SDK there,
 * the GIS script here.
 */
export const authCapabilities: AuthCapabilities = { google: 'full' };

export const authRepository: AuthRepository = {
  /**
   * Not the web Google doorway — `GoogleSignInButton.web.tsx` is, because GIS owns its own click
   * and delivers the credential to a callback rather than returning it to a caller.
   *
   * <p>This member exists because the contract is shared with native, where a `Pressable`'s
   * `onPress` really does call it. Reaching it on web means a screen rendered our own button instead
   * of Google's — a wiring bug, and one that would otherwise present as a dead click. It throws
   * rather than no-ops so that bug is loud in the one place it could hide.
   */
  async signInWithGoogle(): Promise<void> {
    // The message names the fault rather than offering the founder a retry: retrying is the one
    // thing guaranteed to fail again, and this is only reachable via a bug no traveler can act on.
    // "Please try again" would be a lie told politely — and it would make this tripwire quiet, which
    // is the opposite of why it exists.
    throw new AuthError(
      'AUTH_GOOGLE_WEB_WRONG_ENTRY',
      'Wiring bug: on web, Google sign-in goes through GoogleSignInButton.web.tsx (GIS owns the ' +
        'click), not authRepository.signInWithGoogle().',
    );
  },

  async signUpWithEmail(email: string, password: string): Promise<void> {
    try {
      await signUpWithPassword(email, password);
    } catch (error) {
      translate(error);
    }
  },

  async signInWithEmail(email: string, password: string): Promise<void> {
    try {
      await signInWithPassword(email, password);
    } catch (error) {
      translate(error);
    }
  },

  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordReset(email);
    } catch (error) {
      translate(error);
    }
  },

  async resendVerification(): Promise<void> {
    try {
      await resendVerificationRest();
    } catch (error) {
      translate(error);
    }
  },

  async refreshVerification(): Promise<boolean> {
    return refreshVerificationRest();
  },

  async signOut(): Promise<void> {
    signOutRest();
  },

  onAuthStateChanged(listener: (user: AuthUser | null) => void): () => void {
    return subscribe(listener);
  },
};

/**
 * Exchanges a Google ID token from GIS for a Firebase session (S0.6).
 *
 * <p><strong>Why it is not on `authRepository`.</strong> The shared contract is `typeof` the native
 * repository, and native has no use for this: its SDK hands the credential back to the caller, so
 * `signInWithGoogle()` does the whole job there. Adding a web-only member to the shared object would
 * force native to implement something meaningless — and the typechecker said so, which is the seam
 * working. It ships as a plain export instead: `GoogleSignInButton.web.tsx` is already inside the
 * platform fork, so it can import this file directly and no shared type has to lie.
 *
 * <p>Errors go through the same `translate()` as every other doorway, so the button gets an
 * `AuthError` with a founder-readable sentence and the screen renders it like any other failure.
 */
export async function signInWithGoogleCredential(idToken: string): Promise<void> {
  try {
    // requestUri is genuinely the page's own origin — Firebase checks it against the OAuth client's
    // authorized JavaScript origins. Reading it from `location` rather than baking it in is what
    // lets one build serve founders.largata.com and localhost:8081 without a rebuild.
    await signInWithGoogleIdToken(idToken, window.location.origin);
  } catch (error) {
    translate(error);
  }
}

export { AuthCancelled, AuthError } from './authContract';
