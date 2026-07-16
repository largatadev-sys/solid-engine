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
 * <p><strong>A cosmetic Google button</strong> — `authCapabilities.google` is `'cosmetic'` (S0.5).
 * The button renders so the preview shows founders the doorways the Android launch ships; the
 * browser Google flow itself is a separate mechanism the preview does not earn (S0.4 spec, upheld).
 * Email/password is the working web path.
 */

/**
 * Render the button, install nothing (S0.5).
 *
 * Not `'none'`: the preview's job is to show founders what the app looks like, and the app has a
 * Google button. Not `'full'`: there is no browser doorway behind it — `signInWithGoogle` below is
 * what a tap reaches, and it explains rather than fails.
 */
export const authCapabilities: AuthCapabilities = { google: 'cosmetic' };

export const authRepository: AuthRepository = {
  async signInWithGoogle(): Promise<void> {
    // Reachable since S0.5: the button renders on web (`'cosmetic'`) and this is what a tap gets.
    // The message is the feature — sign-in.tsx catches AuthError and renders it — so it points at
    // where Google *does* work rather than reporting a deficiency. A silent no-op would read as a
    // broken app; a raw failure would too.
    throw new AuthError(
      'AUTH_GOOGLE_UNAVAILABLE_ON_WEB',
      'Google sign-in works in the app — use email here in the preview.',
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
