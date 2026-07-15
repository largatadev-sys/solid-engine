import { AuthCancelled, authRepository } from '../src/repositories/authRepository';

/**
 * The auth repository's contract, with the native SDK mocked at the module boundary — the standard
 * shape for `@react-native-firebase` (there is no native runtime under Jest).
 *
 * What these tests defend is the seam, not Firebase: that UI code never learns what a provider is,
 * that a cancelled sign-in is not an error, and that sign-out clears *both* sessions.
 */

const mockSignInWithCredential = jest.fn();
const mockCreateUser = jest.fn();
const mockSignInWithEmail = jest.fn();
const mockSendPasswordReset = jest.fn();
const mockFirebaseSignOut = jest.fn();
const mockSendEmailVerification = jest.fn();

const mockGoogleSignIn = jest.fn();
const mockGoogleSignOut = jest.fn();
const mockHasPlayServices = jest.fn();

jest.mock('@react-native-firebase/auth', () => {
  const auth = () => ({
    signInWithCredential: mockSignInWithCredential,
    createUserWithEmailAndPassword: mockCreateUser,
    signInWithEmailAndPassword: mockSignInWithEmail,
    sendPasswordResetEmail: mockSendPasswordReset,
    signOut: mockFirebaseSignOut,
  });
  auth.GoogleAuthProvider = { credential: (token: string) => ({ token }) };
  return { __esModule: true, default: auth };
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    signIn: () => mockGoogleSignIn(),
    signOut: () => mockGoogleSignOut(),
    hasPlayServices: () => mockHasPlayServices(),
    configure: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockHasPlayServices.mockResolvedValue(true);
  mockCreateUser.mockResolvedValue({ user: { sendEmailVerification: mockSendEmailVerification } });
});

describe('Google sign-in', () => {
  it('exchanges the Google credential for a Firebase session', async () => {
    mockGoogleSignIn.mockResolvedValue({ type: 'success', data: { idToken: 'google-id-token' } });

    await authRepository.signInWithGoogle();

    // The backend trusts only Firebase's issuer, so the Google token must be exchanged, never sent.
    expect(mockSignInWithCredential).toHaveBeenCalledWith({ token: 'google-id-token' });
  });

  it('treats a cancelled picker as AuthCancelled, not a failure', async () => {
    mockGoogleSignIn.mockResolvedValue({ type: 'cancelled' });

    // Backing out of the account picker is a decision, not an error to show the traveler.
    await expect(authRepository.signInWithGoogle()).rejects.toBeInstanceOf(AuthCancelled);
    expect(mockSignInWithCredential).not.toHaveBeenCalled();
  });
});

describe('email flows', () => {
  it('sends a verification email on sign-up but does not block on it', async () => {
    await authRepository.signUpWithEmail('ana@example.com', 'hunter2!');

    expect(mockCreateUser).toHaveBeenCalledWith('ana@example.com', 'hunter2!');
    // Sent, but nothing gates on it: enforcement is S1.2's decision (spec, decision 5).
    expect(mockSendEmailVerification).toHaveBeenCalled();
  });

  it('signs in with email and password', async () => {
    await authRepository.signInWithEmail('ana@example.com', 'hunter2!');

    expect(mockSignInWithEmail).toHaveBeenCalledWith('ana@example.com', 'hunter2!');
  });

  it('sends a password reset email', async () => {
    await authRepository.sendPasswordReset('ana@example.com');

    expect(mockSendPasswordReset).toHaveBeenCalledWith('ana@example.com');
  });
});

describe('sign-out', () => {
  it('clears the Google session as well as the Firebase one', async () => {
    mockGoogleSignOut.mockResolvedValue(undefined);

    await authRepository.signOut();

    // Skipping Google's sign-out leaves the picker silently re-selecting the same account next
    // time, which reads to a traveler as "sign-out did nothing".
    expect(mockGoogleSignOut).toHaveBeenCalled();
    expect(mockFirebaseSignOut).toHaveBeenCalled();
  });

  it('still signs out of Firebase when there is no Google session to clear', async () => {
    // GoogleSignin.signOut() throws when no Google session exists — e.g. an email-only traveler.
    // If that escaped, signing out would fail for exactly the users who never used Google.
    mockGoogleSignOut.mockRejectedValue(new Error('no user signed in'));

    await authRepository.signOut();

    expect(mockFirebaseSignOut).toHaveBeenCalled();
  });
});
