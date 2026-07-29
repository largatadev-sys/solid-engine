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




export function configureGoogleSignIn(webClientId: string): void {
  configureGis(webClientId);
}


export const authCapabilities: AuthCapabilities = { google: 'full' };

export const authRepository: AuthRepository = {

  async signInWithGoogle(): Promise<void> {
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


export async function signInWithGoogleCredential(idToken: string): Promise<void> {
  try {
    await signInWithGoogleIdToken(idToken, window.location.origin);
  } catch (error) {
    translate(error);
  }
}

export { AuthCancelled, AuthError } from './authContract';
