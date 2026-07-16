import {
  AuthError,
  translate,
  type AuthCapabilities,
  type AuthRepository,
  type AuthUser,
} from './authContract';
import {
  getValidIdToken,
  sendPasswordReset,
  signInWithPassword,
  signOut as signOutRest,
  signUpWithPassword,
  subscribe,
} from '../auth/firebaseWebRest';

/**
 * The web twin of `authRepository.native.ts` — <strong>the founders' preview only</strong> (S0.4),
 * on Firebase's Identity Toolkit REST API rather than the Firebase JS SDK.
 *
 * <p><strong>Why REST.</strong> The JS SDK's auth-component registration is a Metro-tree-shaken
 * import side effect that ships broken on web (white screen, "Component auth has not been registered
 * yet"); REST imports nothing from `firebase/*`, so there is nothing to register and nothing for the
 * bundler to drop. See `firebaseWebRest.ts` for the full account. The tokens are ordinary Firebase
 * ID tokens, so the backend contract (ADR-006) is unchanged.
 *
 * <p><strong>Read before trusting anything it does.</strong> This is a founder demo, never
 * device-AC evidence — the shipping artifact is the APK, whose doorway is `.native.ts`. A green
 * sign-in here is evidence about this file, not about the app (spec).
 *
 * <p><strong>No Google button</strong> — `authCapabilities.google` is false. The browser Google flow
 * is a separate mechanism the preview does not earn (spec); email/password is the web path.
 */

/** Web has no native picker, and the REST preview does not implement the browser Google flow. */
export const authCapabilities: AuthCapabilities = { google: false };

export const authRepository: AuthRepository = {
  async signInWithGoogle(): Promise<void> {
    // Unreachable through the UI (the button is hidden), but the shared contract requires the method
    // to exist. It throws rather than no-op so a caller ignoring the capability flag fails loudly.
    throw new AuthError(
      'AUTH_GOOGLE_UNAVAILABLE_ON_WEB',
      'Google sign-in is not available in the browser preview. Use email and password.',
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

  async signOut(): Promise<void> {
    signOutRest();
  },

  onAuthStateChanged(listener: (user: AuthUser | null) => void): () => void {
    return subscribe(listener);
  },
};

export { AuthCancelled, AuthError } from './authContract';
