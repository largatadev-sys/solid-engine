import { authCapabilities as nativeCapabilities } from '../src/repositories/authRepository.native';
import { authCapabilities as webCapabilities } from '../src/repositories/authRepository.web';

jest.mock('@react-native-firebase/auth', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('@react-native-google-signin/google-signin', () => ({ GoogleSignin: {} }));



describe('auth capabilities (S0.5 tri-state, S0.6 web doorway)', () => {
  it('native has a working Google doorway', () => {
    expect(nativeCapabilities.google).toBe('full');
  });

  it('the web preview has a real Google doorway since S0.6', () => {
    expect(webCapabilities.google).toBe('full');
  });

  it('both platforms render the button and install a doorway — a different one each', () => {
    const renders = (c: { google: string }) => c.google !== 'none';
    const installsDoorway = (c: { google: string }) => c.google === 'full';

    expect(renders(nativeCapabilities)).toBe(true);
    expect(renders(webCapabilities)).toBe(true);

    expect(installsDoorway(nativeCapabilities)).toBe(true);
    expect(installsDoorway(webCapabilities)).toBe(true);
  });
});

describe('the web install path exists (S0.6 — the crash the flag flip would have caused)', () => {
  it('the web repository exports configureGoogleSignIn, as googleSignInConfig imports it', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const web = require('../src/repositories/authRepository.web');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const native = require('../src/repositories/authRepository.native');

    expect(typeof web.configureGoogleSignIn).toBe('function');
    expect(typeof native.configureGoogleSignIn).toBe('function');
  });

  it('web signInWithGoogle throws rather than dead-clicking if ever reached', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { authRepository, AuthError } = require('../src/repositories/authRepository.web');

    const error = await authRepository.signInWithGoogle().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AuthError);
    expect((error as { code: string }).code).toBe('AUTH_GOOGLE_WEB_WRONG_ENTRY');
  });
});
