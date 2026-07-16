import {
  createUserWithEmailAndPassword,
  onAuthStateChanged as onAuthStateChangedWeb,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as signOutWeb,
} from 'firebase/auth';
import { webAuth } from '../auth/firebaseWebApp';
import {
  AuthCancelled,
  AuthError,
  translate,
  type AuthCapabilities,
  type AuthRepository,
  type AuthUser,
} from './authContract';

/**
 * The web twin of `authRepository.native.ts` — <strong>the founders' preview only</strong> (S0.4).
 *
 * <p><strong>Read this before trusting anything it does.</strong> This file exists because the
 * founders carry iPhones and no Apple developer account exists yet, so a browser is the only way
 * they can touch the product before the iOS activation (ADR-010). It is interim by decision, not by
 * accident: the artifact that ships is the APK, and its doorway is `.native.ts`. A green sign-in
 * here is evidence about *this file*, never about the app — the S0.2 `getTokens()` bug lived
 * entirely in the native SDK's disagreement with its own TypeScript types and was invisible to every
 * non-device test. Device ACs are closed on devices (spec).
 *
 * <p><strong>Why the SDKs differ at all.</strong> Firebase owns identity uniformly — same user pool,
 * same JWT, same resource-server contract (ADR-006). What is per-platform is the *doorway*: RNFirebase
 * drives native code that a browser has no equivalent for. So the fork is exactly this file and
 * `firebaseTokenSource.web.ts`, and it sits under the repository seam where ADR-001 always meant to
 * absorb this kind of thing.
 *
 * <p><strong>No Google button here</strong> — `authCapabilities.google` is false. The browser's
 * Google flow is a different mechanism (popup/redirect + authorized domains + its own failure
 * modes), it is a day of work, and it buys a preview audience nothing that email sign-in does not.
 * When the real web surface ships (backlog epic), it builds that doorway properly and flips this
 * flag; no screen changes.
 */

/** Web has no native picker, and the popup flow is deliberately unbuilt — spec decision. */
export const authCapabilities: AuthCapabilities = { google: false };

export const authRepository: AuthRepository = {
  async signInWithGoogle(): Promise<void> {
    // Unreachable through the UI (`authCapabilities.google` hides the button), but the contract is
    // shared, so the method must exist. It throws rather than silently no-ops: a caller that got
    // here has ignored the capability flag, and a quiet failure would look like a broken button.
    throw new AuthError(
      'AUTH_GOOGLE_UNAVAILABLE_ON_WEB',
      'Google sign-in is not available in the browser preview. Use email and password.',
    );
  },

  async signUpWithEmail(email: string, password: string): Promise<void> {
    try {
      const credential = await createUserWithEmailAndPassword(webAuth(), email, password);
      // Mirrors native: sent, nothing gates on it until S1.2 gives verification stakes.
      await sendEmailVerification(credential.user);
    } catch (error) {
      translate(error);
    }
  },

  async signInWithEmail(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(webAuth(), email, password);
    } catch (error) {
      translate(error);
    }
  },

  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(webAuth(), email);
    } catch (error) {
      translate(error);
    }
  },

  async signOut(): Promise<void> {
    // No GoogleSignin session to clear on web — the native twin's extra call has no counterpart.
    await signOutWeb(webAuth());
  },

  onAuthStateChanged(listener: (user: AuthUser | null) => void): () => void {
    return onAuthStateChangedWeb(webAuth(), (user) =>
      listener(user === null ? null : { uid: user.uid }),
    );
  },
};

export { AuthCancelled, AuthError };
