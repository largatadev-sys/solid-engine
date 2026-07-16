import { authCapabilities as nativeCapabilities } from '../src/repositories/authRepository.native';
import {
  authCapabilities as webCapabilities,
  authRepository as webRepository,
} from '../src/repositories/authRepository.web';
import { AuthError } from '../src/repositories/authContract';

// The native file imports the RNFirebase SDK at module load, which has no native runtime under Jest
// ("Native module RNFBAppModule not found"). Stubbed to nothing: these tests read a declared
// constant, so what the SDK would do is irrelevant — `authRepository.test.ts` owns its behaviour.
jest.mock('@react-native-firebase/auth', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('@react-native-google-signin/google-signin', () => ({ GoogleSignin: {} }));

/**
 * The capability seam, both platforms, in one file (S0.5).
 *
 * <p><strong>Why imports by explicit path.</strong> Every other suite here runs under the native
 * Jest preset, so `from '../src/repositories/authRepository'` always resolves `.native.ts` — which
 * means the web twin's declarations are unreachable by the usual import. Naming both files directly
 * is what lets one test compare them. The web file is importable under the native preset because it
 * pulls in `firebaseWebRest` (plain `fetch`, no `firebase/*`) rather than an SDK — a property S0.4's
 * REST pivot bought and `layering.test.ts` defends.
 *
 * <p><strong>What this defends.</strong> The tri-state exists because rendering the button and
 * having a working doorway are different questions (S0.5 spec). The pairing below is the whole
 * point: web renders the button *and* has no doorway, and that combination must stay representable
 * and true. A boolean could not say it, and the day someone "simplifies" it back, this fails.
 */

describe('auth capabilities (S0.5 tri-state)', () => {
  it('native has a working Google doorway', () => {
    // 'full' is what makes _layout.tsx configure the native SDK; anything else silently disables
    // Google sign-in on the shipping app.
    expect(nativeCapabilities.google).toBe('full');
  });

  it('the web preview shows the Google button without claiming a doorway', () => {
    // The founders' preview exists to show what the Android app looks like (S0.5): the button is
    // rendered, but the browser doorway was deliberately never built.
    expect(webCapabilities.google).toBe('cosmetic');
  });

  it('both platforms render the button; only native installs the SDK', () => {
    // The two questions the old boolean conflated, asserted as the call sites ask them.
    const renders = (c: { google: string }) => c.google !== 'none';
    const installsSdk = (c: { google: string }) => c.google === 'full';

    expect(renders(nativeCapabilities)).toBe(true);
    expect(renders(webCapabilities)).toBe(true);

    expect(installsSdk(nativeCapabilities)).toBe(true);
    // The load-bearing one: installGoogleSignIn() throws without a client id, so a web build that
    // installed the SDK would be a startup crash — a white screen for a cosmetic button.
    expect(installsSdk(webCapabilities)).toBe(false);
  });
});

describe('the cosmetic button never dead-clicks (S0.5)', () => {
  it('tapping Google on the preview explains where it does work', async () => {
    // This thrown message IS the tap UX, not just a guard: sign-in.tsx catches AuthError and
    // renders `message`. It frames the button as a promise about the app rather than a deficiency
    // of the preview — which is why a dead click (or a raw error) would defeat the story.
    const error = await webRepository.signInWithGoogle().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).message).toBe(
      'Google sign-in works in the app — use email here in the preview.',
    );
  });
});
