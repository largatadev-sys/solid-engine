import { AuthError } from '../src/repositories/authContract';
import { handleGoogleCredential } from '../src/auth/googleCredentialHandler';

const mockSignIn = jest.fn();

jest.mock('../src/repositories/authRepository.web', () => ({
  signInWithGoogleCredential: (idToken: string) => mockSignIn(idToken),
}));

/**
 * The inch between Google's callback and the screen (S0.6) — the seam the story exists to protect.
 *
 * <p>The spec's words: *"A founder who completes the Google popup and then sees nothing is the
 * dead-click failure this story exists to prevent."* Everything below is that sentence as
 * assertions. The modules on either side have their own suites; what none of them can see is
 * whether a credential becomes busy state, a session, or a sentence — which is exactly where the
 * S0.2 `getTokens()` bug lived, in the inch between two things that were each individually fine.
 */

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
    // THE dead-click test. A founder who completed Google's account chooser and gets nothing back
    // cannot tell whether it worked — the failure this story exists to prevent, one layer deeper
    // than S0.5's cosmetic-button version of it.
    mockSignIn.mockRejectedValue(new AuthError('auth/invalid-credential', 'That did not work.'));
    const cb = callbacks();

    await handleGoogleCredential('google-id-token', cb);

    expect(cb.onError).toHaveBeenCalledWith('That did not work.');
    // And busy must clear, or the screen spins forever on a failure it already reported.
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
    // The bug this pins, found in review: GIS renders into a cross-origin iframe that owns its own
    // event handling, so `pointerEvents: 'none'` on our host View does not reliably stop a click.
    // The prop has to be enforced where the decision is made — here. Without it, an email sign-in
    // in flight gets stomped by `busy = 'google'` and two sign-ins race for one session.
    const cb = callbacks({ isDisabled: () => true });

    await handleGoogleCredential('google-id-token', cb);

    expect(mockSignIn).not.toHaveBeenCalled();
    expect(cb.onStart).not.toHaveBeenCalled();
    // Silent *here* by design: the founder started something else and is watching that. This is the
    // one path where saying nothing is right — every other one ends in a sentence.
    expect(cb.onError).not.toHaveBeenCalled();
    expect(cb.onSettle).not.toHaveBeenCalled();
  });

  it('reads disabled at credential time, not at registration time', async () => {
    // GIS registers one callback for the page's life, so a captured boolean would be the value at
    // mount forever — a guard that stops working the moment it matters. The callback shape is what
    // makes it a guard rather than a decoration.
    let busy = true;
    const cb = callbacks({ isDisabled: () => busy });

    await handleGoogleCredential('google-id-token', cb);
    expect(mockSignIn).not.toHaveBeenCalled();

    busy = false;
    await handleGoogleCredential('google-id-token', cb);
    expect(mockSignIn).toHaveBeenCalledWith('google-id-token');
  });
});
