import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  AuthCancelled,
  AuthError,
  translate,
  type AuthCapabilities,
  type AuthUser,
} from './authContract';

/**
 * The repository layer for identity (ADR-001): screens and hooks call these, never Firebase.
 *
 * The same rule as `healthRepository` — UI code does not know what a provider is. Here it buys
 * something extra: the whole Firebase surface is confined to two files (this and
 * `firebaseTokenSource`), which is what ADR-006's "designed exit" (swap the provider, keep the
 * Traveler) means in practice.
 *
 * <p><strong>This is the file that ships</strong> (S0.4). Metro resolves `.native.ts` for the APK
 * and `.web.ts` for the founders' preview; the web twin is interim scaffolding, this one is the
 * product. Native-layer behaviour therefore gets proven on a device and nowhere else — the S0.2
 * `getTokens()` bug below is the standing reminder of why a green browser proves nothing here.
 *
 * Note what is *not* here: no `/v1/me` call, no Traveler. Signing in and having a domain identity
 * are different things (`travelerRepository` owns the latter) — the backend provisions the Traveler
 * on first contact, so nothing here needs to ask it to.
 */
/**
 * Wires the Google SDK to our Firebase project. Must run before any `signIn()`.
 *
 * `webClientId` is not a copy-paste of the Android client id: Firebase verifies the Google token
 * against the *web* OAuth client it auto-created when Google sign-in was enabled in the console.
 * Without this call `signIn()` resolves with a null `idToken` and sign-in fails at the exchange —
 * no error message names the missing configure(), which is what makes it worth this comment.
 *
 * The id comes from the gitignored `google-services.json` via Expo's extra config, never a
 * hardcoded literal (it is environment config, per the spec's decision 4).
 */
export function configureGoogleSignIn(webClientId: string): void {
  GoogleSignin.configure({ webClientId });
}

/**
 * Android has the native account picker, so the doorway is real.
 *
 * The web twin also declares `'full'` since S0.6 — a *different* doorway (Google Identity Services
 * in the browser), which is exactly what this flag does and does not promise: a doorway exists, not
 * that it is this one's.
 */
export const authCapabilities: AuthCapabilities = { google: 'full' };

export const authRepository = {
  async signInWithGoogle(): Promise<void> {
    try {
      // hasPlayServices first: on a device without them the native picker fails with an opaque
      // error, and this turns it into the library's typed one.
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (response.type === 'cancelled') {
        throw new AuthCancelled();
      }

      if (response.data.idToken === null) {
        throw new AuthError('AUTH_NO_ID_TOKEN', 'Sign-in failed. Please try again.');
      }

      // Both tokens, not just the idToken `signIn()` hands back — and this is not belt-and-braces.
      // RNFirebase v25's JS layer accepts `credential(idToken)` alone (it only rejects when *both*
      // are null), but its **native** layer then throws `accessToken cannot be empty`. The two
      // layers disagree, so the JS signature lies about what works. `getTokens()` is the library's
      // own way to get both; passing them satisfies the native side.
      //
      // Found only on a device: every unit test passed, the picker worked, the SHA-1 was right.
      // The bug lived in the one inch between "the mock returns an idToken" and "the native SDK
      // accepts what we built from it" — which is precisely why this AC was never claimed on the
      // strength of green tests.
      const { idToken, accessToken } = await GoogleSignin.getTokens();

      // Google's tokens are exchanged for a Firebase one: the backend only ever trusts Firebase's
      // issuer, so the Google credential is a step on the way, never something we send.
      await auth().signInWithCredential(auth.GoogleAuthProvider.credential(idToken, accessToken));
    } catch (error) {
      if (error instanceof AuthError) throw error;
      translate(error);
    }
  },

  async signUpWithEmail(email: string, password: string): Promise<void> {
    try {
      const credential = await auth().createUserWithEmailAndPassword(email, password);
      // Sent, but nothing gates on it (spec, decision 5): enforcement is S1.2's call, where the
      // invite flow gives verification a reason to exist. Firing it now costs one line and means
      // the flag is populated when that story arrives.
      await credential.user.sendEmailVerification();
    } catch (error) {
      translate(error);
    }
  },

  async signInWithEmail(email: string, password: string): Promise<void> {
    try {
      await auth().signInWithEmailAndPassword(email, password);
    } catch (error) {
      translate(error);
    }
  },

  async sendPasswordReset(email: string): Promise<void> {
    try {
      await auth().sendPasswordResetEmail(email);
    } catch (error) {
      translate(error);
    }
  },

  /**
   * Re-sends the email-verification link to the signed-in account (S1.2, the verify-waiting state).
   * Needed when a password sign-up tries to accept an invitation before verifying — the backend
   * answers 403 EMAIL_NOT_VERIFIED and the app offers to resend.
   */
  async resendVerification(): Promise<void> {
    try {
      await auth().currentUser?.sendEmailVerification();
    } catch (error) {
      translate(error);
    }
  },

  /**
   * Re-checks whether the email is now verified, forcing a fresh token so the backend sees the
   * updated claim (S1.2). `reload()` refreshes the account's `emailVerified`; `getIdToken(true)` mints
   * a new token carrying `email_verified: true`, so the next API call — the retried accept — passes
   * the gate. Returns whether it is now verified, so the UI knows whether to retry or keep waiting.
   */
  async refreshVerification(): Promise<boolean> {
    try {
      const user = auth().currentUser;
      if (user === null) return false;
      await user.reload();
      await user.getIdToken(true);
      return auth().currentUser?.emailVerified ?? false;
    } catch (error) {
      translate(error);
    }
  },

  async signOut(): Promise<void> {
    // Google's session is separate from Firebase's: skipping this leaves the account picker
    // silently re-selecting the same account on the next sign-in, which reads as "sign-out is
    // broken". signOut() throws if no Google session exists, hence the catch.
    await GoogleSignin.signOut().catch(() => undefined);
    await auth().signOut();
  },

  /**
   * Fires immediately with the restored session at app start, then on every change.
   *
   * Narrowed to `AuthUser` (id only) rather than the SDK's user object: the JS SDK's equivalent is a
   * different type, and anything above this seam that named either would compile on one platform
   * only. `uid` is all a caller needs — the AuthProvider's question is signed-in-or-not.
   */
  onAuthStateChanged(listener: (user: AuthUser | null) => void): () => void {
    return auth().onAuthStateChanged((user) => listener(user === null ? null : { uid: user.uid }));
  },
};

/** The type both platform files satisfy — exported here so `.web.ts` is checked against it. */
export type AuthRepository = typeof authRepository;

// The errors and the code translation live in `authContract` (shared): a screen's `error instanceof
// AuthError` compares class identity, so a per-platform copy would be a *different* class and the
// check would quietly fail on one of the two builds. Re-exported so callers keep importing from the
// repository, unaware there is a seam here at all.
export { AuthCancelled, AuthError };
