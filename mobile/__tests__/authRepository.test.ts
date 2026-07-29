import { AuthCancelled, AuthError, authRepository } from '../src/repositories/authRepository';



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

    expect(mockGetTokens).toHaveBeenCalled();
    expect(mockSignInWithCredential).toHaveBeenCalledWith({
      idToken: 'google-id-token',
      accessToken: 'google-access-token',
    });
  });

  it('treats a cancelled picker as AuthCancelled, not a failure', async () => {
    mockGoogleSignIn.mockResolvedValue({ type: 'cancelled' });

    await expect(authRepository.signInWithGoogle()).rejects.toBeInstanceOf(AuthCancelled);
    expect(mockSignInWithCredential).not.toHaveBeenCalled();
  });
});

describe('email flows', () => {
  it('sends a verification email on sign-up but does not block on it', async () => {
    await authRepository.signUpWithEmail('ana@example.com', 'hunter2!');

    expect(mockCreateUser).toHaveBeenCalledWith('ana@example.com', 'hunter2!');
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

    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).message).toBe('That email address is not valid.');
  });

  it('does not reveal which half of a credential was wrong', async () => {
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
    mockGoogleSignIn.mockResolvedValue({ type: 'cancelled' });

    await expect(authRepository.signInWithGoogle()).rejects.toBeInstanceOf(AuthCancelled);
  });
});

describe('sign-out', () => {
  it('clears the Google session as well as the Firebase one', async () => {
    mockGoogleSignOut.mockResolvedValue(undefined);

    await authRepository.signOut();

    expect(mockGoogleSignOut).toHaveBeenCalled();
    expect(mockFirebaseSignOut).toHaveBeenCalled();
  });

  it('still signs out of Firebase when there is no Google session to clear', async () => {
    mockGoogleSignOut.mockRejectedValue(new Error('no user signed in'));

    await authRepository.signOut();

    expect(mockFirebaseSignOut).toHaveBeenCalled();
  });
});
