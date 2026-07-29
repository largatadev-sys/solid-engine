import { AuthError } from '../repositories/authContract';
import { signInWithGoogleCredential } from '../repositories/authRepository.web';




export interface CredentialHandlerCallbacks {
  readonly onStart: () => void;
  readonly onSettle: () => void;
  readonly onError: (message: string) => void;

  readonly isDisabled: () => boolean;
}


export async function handleGoogleCredential(
  idToken: string,
  callbacks: CredentialHandlerCallbacks,
): Promise<void> {
  if (callbacks.isDisabled()) return;

  callbacks.onStart();
  try {
    await signInWithGoogleCredential(idToken);
  } catch (error) {
    callbacks.onError(
      error instanceof AuthError ? error.message : 'Sign-in failed. Please try again.',
    );
  } finally {
    callbacks.onSettle();
  }
}


export const GIS_UNAVAILABLE_MESSAGE =
  'Google sign-in is unavailable right now. Use email, or try again.';
