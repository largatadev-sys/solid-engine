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
export const authRepository = {
  async signInWithGoogle(): Promise<void> {
    // hasPlayServices first: on a device without them the native picker fails with an opaque
    // error, and this turns it into the library's typed one.
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (response.type === 'cancelled') {
      throw new AuthCancelled();
    }

    const idToken = response.data.idToken;
    if (idToken === null) {
      throw new Error('Google sign-in returned no idToken');
    }

    // Google's token is exchanged for a Firebase one: the backend only ever trusts Firebase's
    // issuer, so the Google credential is a step on the way, never something we send.
    await auth().signInWithCredential(auth.GoogleAuthProvider.credential(idToken));
  },

  async signUpWithEmail(email: string, password: string): Promise<void> {
    const credential = await auth().createUserWithEmailAndPassword(email, password);
    // Sent, but nothing gates on it (spec, decision 5): enforcement is S1.2's call, where the
    // invite flow gives verification a reason to exist. Firing it now costs one line and means
    // the flag is populated when that story arrives.
    await credential.user.sendEmailVerification();
  },

  async signInWithEmail(email: string, password: string): Promise<void> {
    await auth().signInWithEmailAndPassword(email, password);
  },

  async sendPasswordReset(email: string): Promise<void> {
    await auth().sendPasswordResetEmail(email);
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
