import { AuthCancelled, AuthError, authRepository } from '../src/repositories/authRepository';

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
const mockGoogleConfigure = jest.fn();
const mockGetTokens = jest.fn();

jest.mock('@react-native-firebase/auth', () => {
  const auth = () => ({
    signInWithCredential: mockSignInWithCredential,
    createUserWithEmailAndPassword: mockCreateUser,
    signInWithEmailAndPassword: mockSignInWithEmail,
    sendPasswordResetEmail: mockSendPasswordReset,
    signOut: mockFirebaseSignOut,
  });
  // Mirrors the native contract, not the JS signature: RNFirebase v25's JS layer accepts an
  // idToken alone, but its native layer throws `accessToken cannot be empty`. A mock that copied
  // the permissive JS signature is what let the real bug through to a device — so this one
  // enforces what the device enforces.
  auth.GoogleAuthProvider = {
    credential: (idToken: string, accessToken: string) => {
      if (!accessToken) throw new Error('Exception in HostFunction: accessToken cannot be empty');
      return { idToken, accessToken };
    },
  };
  return { __esModule: true, default: auth };
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    signIn: () => mockGoogleSignIn(),
    signOut: () => mockGoogleSignOut(),
    hasPlayServices: () => mockHasPlayServices(),
    configure: (options: unknown) => mockGoogleConfigure(options),
    getTokens: () => mockGetTokens(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockHasPlayServices.mockResolvedValue(true);
  mockCreateUser.mockResolvedValue({ user: { sendEmailVerification: mockSendEmailVerification } });
  mockGetTokens.mockResolvedValue({ idToken: 'google-id-token', accessToken: 'google-access-token' });
});

describe('Google sign-in configuration', () => {
  // This is the gap a mock cannot see on its own: the SDK must be configured with the *web*
  // client id before any signIn(), or signIn() resolves with a null idToken and the exchange
  // fails — with nothing naming the missing configure(). The mock happily returns an idToken
  // regardless, so without these two tests, "Google sign-in works" was proven only by a fiction.
  it('configures the SDK with the web client id from environment config', () => {
    jest.isolateModules(() => {
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = '123-abc.apps.googleusercontent.com';
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../src/auth/googleSignInConfig').installGoogleSignIn();
    });

    expect(mockGoogleConfigure).toHaveBeenCalledWith({
      webClientId: '123-abc.apps.googleusercontent.com',
    });
  });

  it('fails loudly at startup when the web client id is missing', () => {
    // A misconfigured build should die immediately, not look fine until someone taps
    // "Continue with Google" and gets an unexplained failure at the token exchange.
    jest.isolateModules(() => {
      delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { installGoogleSignIn } = require('../src/auth/googleSignInConfig');
      expect(() => installGoogleSignIn()).toThrow(/EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/);
    });
  });
});

describe('Google sign-in', () => {
  it('exchanges the Google credential for a Firebase session, passing BOTH tokens', async () => {
    mockGoogleSignIn.mockResolvedValue({ type: 'success', data: { idToken: 'google-id-token' } });

    await authRepository.signInWithGoogle();

    // Both tokens, from getTokens() — not just the idToken signIn() returns. RNFirebase's native
    // layer rejects an empty accessToken even though its JS signature allows one, and this
    // assertion is the regression guard for that (the failure was `auth/unknown: accessToken
    // cannot be empty`, reachable only on a device).
    expect(mockGetTokens).toHaveBeenCalled();
    expect(mockSignInWithCredential).toHaveBeenCalledWith({
      idToken: 'google-id-token',
      accessToken: 'google-access-token',
    });
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

describe('error translation at the boundary (ADR-001, 06b §6)', () => {
  it('turns a Firebase auth/... code into a typed AuthError with a readable message', async () => {
    mockSignInWithEmail.mockRejectedValue({ code: 'auth/invalid-email' });

    const error = await authRepository.signInWithEmail('nope', 'x').catch((e: unknown) => e);

    // Screens must never see `auth/...` codes: that would be UI code knowing the provider exists,
    // and every auth screen re-implementing the same cascade.
    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).message).toBe('That email address is not valid.');
  });

  it('does not reveal which half of a credential was wrong', async () => {
    // Distinguishing "no such account" from "wrong password" hands anyone with a list of emails a
    // way to learn which are registered.
    mockSignInWithEmail.mockRejectedValue({ code: 'auth/user-not-found' });
    const notFound = await authRepository.signInWithEmail('a@b.c', 'x').catch((e: unknown) => e);

    mockSignInWithEmail.mockRejectedValue({ code: 'auth/wrong-password' });
    const wrongPassword = await authRepository.signInWithEmail('a@b.c', 'x').catch((e: unknown) => e);

    expect((notFound as AuthError).message).toBe((wrongPassword as AuthError).message);
  });

  it('translates an unrecognised failure rather than leaking it raw', async () => {
    mockCreateUser.mockRejectedValue(new Error('something nobody anticipated'));

    const error = await authRepository.signUpWithEmail('a@b.c', 'x').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).message).toBe('Sign-in failed. Please try again.');
  });

  it('lets AuthCancelled through untranslated', async () => {
    // Cancellation is not a failure and must not be flattened into one by the catch-all.
    mockGoogleSignIn.mockResolvedValue({ type: 'cancelled' });

    await expect(authRepository.signInWithGoogle()).rejects.toBeInstanceOf(AuthCancelled);
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
