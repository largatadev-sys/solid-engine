import { AuthError } from '../src/repositories/authContract';
import { handleGoogleCredential } from '../src/auth/googleCredentialHandler';

const mockSignIn = jest.fn();

jest.mock('../src/repositories/authRepository.web', () => ({
  signInWithGoogleCredential: (idToken: string) => mockSignIn(idToken),
}));



function callbacks(overrides: Partial<Parameters<typeof handleGoogleCredential>[1]> = {}) {
  return {
    onStart: jest.fn(),
    onSettle: jest.fn(),
    onError: jest.fn(),
    isDisabled: () => false,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSignIn.mockResolvedValue(undefined);
});

describe('the credential path drives the screen (S0.6)', () => {
  it('marks the screen busy, exchanges the credential, then settles', async () => {
    const cb = callbacks();

    await handleGoogleCredential('google-id-token', cb);

    expect(cb.onStart).toHaveBeenCalled();
    expect(mockSignIn).toHaveBeenCalledWith('google-id-token');
    expect(cb.onSettle).toHaveBeenCalled();
    expect(cb.onError).not.toHaveBeenCalled();
  });

  it('reports a failed exchange as a sentence, never silence', async () => {
    mockSignIn.mockRejectedValue(new AuthError('auth/invalid-credential', 'That did not work.'));
    const cb = callbacks();

    await handleGoogleCredential('google-id-token', cb);

    expect(cb.onError).toHaveBeenCalledWith('That did not work.');
    expect(cb.onSettle).toHaveBeenCalled();
  });

  it('translates an unrecognised failure rather than leaking it raw', async () => {
    mockSignIn.mockRejectedValue(new Error('some raw internal thing'));
    const cb = callbacks();

    await handleGoogleCredential('google-id-token', cb);

    expect(cb.onError).toHaveBeenCalledWith('Sign-in failed. Please try again.');
    expect(cb.onSettle).toHaveBeenCalled();
  });

  it('settles even when the exchange throws, so the screen never sticks busy', async () => {
    mockSignIn.mockRejectedValue(new AuthError('auth/network-request-failed', 'No connection.'));
    const cb = callbacks();

    await handleGoogleCredential('google-id-token', cb);

    expect(cb.onSettle).toHaveBeenCalledTimes(1);
  });
});

describe('disabled means disabled (S0.6 — the iframe cannot enforce it)', () => {
  it('ignores a credential that arrives while the screen is busy elsewhere', async () => {
    const cb = callbacks({ isDisabled: () => true });

    await handleGoogleCredential('google-id-token', cb);

    expect(mockSignIn).not.toHaveBeenCalled();
    expect(cb.onStart).not.toHaveBeenCalled();
    expect(cb.onError).not.toHaveBeenCalled();
    expect(cb.onSettle).not.toHaveBeenCalled();
  });

  it('reads disabled at credential time, not at registration time', async () => {
    let busy = true;
    const cb = callbacks({ isDisabled: () => busy });

    await handleGoogleCredential('google-id-token', cb);
    expect(mockSignIn).not.toHaveBeenCalled();

    busy = false;
    await handleGoogleCredential('google-id-token', cb);
    expect(mockSignIn).toHaveBeenCalledWith('google-id-token');
  });
});
