import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  AuthCancelled,
  AuthError,
  translate,
  type AuthCapabilities,
  type AuthUser,
} from './authContract';



export function configureGoogleSignIn(webClientId: string): void {
  GoogleSignin.configure({ webClientId });
}


export const authCapabilities: AuthCapabilities = { google: 'full' };

export const authRepository = {
  async signInWithGoogle(): Promise<void> {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (response.type === 'cancelled') {
        throw new AuthCancelled();
      }

      if (response.data.idToken === null) {
        throw new AuthError('AUTH_NO_ID_TOKEN', 'Sign-in failed. Please try again.');
      }

      const { idToken, accessToken } = await GoogleSignin.getTokens();

      await auth().signInWithCredential(auth.GoogleAuthProvider.credential(idToken, accessToken));
    } catch (error) {
      if (error instanceof AuthError) throw error;
      translate(error);
    }
  },

  async signUpWithEmail(email: string, password: string): Promise<void> {
    try {
      const credential = await auth().createUserWithEmailAndPassword(email, password);
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


  async resendVerification(): Promise<void> {
    try {
      await auth().currentUser?.sendEmailVerification();
    } catch (error) {
      translate(error);
    }
  },


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
    await GoogleSignin.signOut().catch(() => undefined);
    await auth().signOut();
  },


  onAuthStateChanged(listener: (user: AuthUser | null) => void): () => void {
    return auth().onAuthStateChanged((user) => listener(user === null ? null : { uid: user.uid }));
  },
};


export type AuthRepository = typeof authRepository;

export { AuthCancelled, AuthError };
