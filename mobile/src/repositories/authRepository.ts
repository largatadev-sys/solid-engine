import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

/**
 * The repository layer for identity (ADR-001): screens and hooks call these, never Firebase.
 *
 * The same rule as `healthRepository` — UI code does not know what a provider is. Here it buys
 * something extra: the whole Firebase surface is confined to two files (this and
 * `firebaseTokenSource`), which is what ADR-006's "designed exit" (swap the provider, keep the
 * Traveler) means in practice.
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

      const idToken = response.data.idToken;
      if (idToken === null) {
        throw new AuthError('AUTH_NO_ID_TOKEN', 'Sign-in failed. Please try again.');
      }

      // Google's token is exchanged for a Firebase one: the backend only ever trusts Firebase's
      // issuer, so the Google credential is a step on the way, never something we send.
      await auth().signInWithCredential(auth.GoogleAuthProvider.credential(idToken));
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

  async signOut(): Promise<void> {
    // Google's session is separate from Firebase's: skipping this leaves the account picker
    // silently re-selecting the same account on the next sign-in, which reads as "sign-out is
    // broken". signOut() throws if no Google session exists, hence the catch.
    await GoogleSignin.signOut().catch(() => undefined);
    await auth().signOut();
  },

  /** Fires immediately with the restored session at app start, then on every change. */
  onAuthStateChanged(listener: (user: FirebaseAuthTypes.User | null) => void): () => void {
    return auth().onAuthStateChanged(listener);
  },
};

/** The user backed out of the native picker. Not an error to show — nothing went wrong. */
export class AuthCancelled extends Error {
  constructor() {
    super('Sign-in was cancelled.');
    this.name = 'AuthCancelled';
  }
}

/**
 * The one typed error the auth layer throws — the counterpart to `ApiError` for the identity
 * provider (06b §6, P6: one typed gateway per boundary).
 *
 * Screens render `message` and never see a Firebase `auth/…` code. That is the ADR-001 boundary
 * doing its job: an earlier version translated these codes inside the sign-in screen, which meant
 * UI code knew the provider existed — and every future auth screen would have re-implemented the
 * same cascade (and drifted).
 */
export class AuthError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

/**
 * Firebase's `auth/…` codes, translated once, at the boundary.
 *
 * Deliberately vague about *which half* of a credential was wrong: distinguishing "no such account"
 * from "wrong password" hands anyone with a list of emails a way to learn which are registered.
 */
function translate(error: unknown): never {
  if (error instanceof AuthCancelled) throw error;

  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';

  switch (code) {
    case 'auth/invalid-email':
      throw new AuthError(code, 'That email address is not valid.');
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      throw new AuthError(code, 'Email or password is incorrect.');
    case 'auth/email-already-in-use':
      throw new AuthError(code, 'An account with that email already exists.');
    case 'auth/weak-password':
      throw new AuthError(code, 'Password must be at least 6 characters.');
    case 'auth/network-request-failed':
      throw new AuthError(code, 'Could not reach the server. Check your connection.');
    case 'auth/too-many-requests':
      throw new AuthError(code, 'Too many attempts. Try again shortly.');
    default:
      throw new AuthError(code === '' ? 'AUTH_FAILED' : code, 'Sign-in failed. Please try again.');
  }
}
