import { authCapabilities as nativeCapabilities } from '../src/repositories/authRepository.native';
import { authCapabilities as webCapabilities } from '../src/repositories/authRepository.web';

// The native file imports the RNFirebase SDK at module load, which has no native runtime under Jest
// ("Native module RNFBAppModule not found"). Stubbed to nothing: these tests read a declared
// constant, so what the SDK would do is irrelevant — `authRepository.test.ts` owns its behaviour.
jest.mock('@react-native-firebase/auth', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('@react-native-google-signin/google-signin', () => ({ GoogleSignin: {} }));

/**
 * The capability seam, both platforms, in one file (S0.5; web moved to `'full'` at S0.6).
 *
 * <p><strong>Why imports by explicit path.</strong> Every other suite here runs under the native
 * Jest preset, so `from '../src/repositories/authRepository'` always resolves `.native.ts` — which
 * means the web twin's declarations are unreachable by the usual import. Naming both files directly
 * is what lets one test compare them. The web file is importable under the native preset because it
 * pulls in `firebaseWebRest` (plain `fetch`, no `firebase/*`) rather than an SDK — a property S0.4's
 * REST pivot bought and `layering.test.ts` defends.
 *
 * <p><strong>What this defends, now.</strong> Both platforms declare `'full'` since S0.6, which
 * makes the interesting assertion no longer "the two differ" but "`'full'` does not mean the native
 * SDK". Each platform installs *something* on `'full'`, and what it installs forks: the native
 * Google SDK there, the GIS script here. The tri-state's third state stays representable — that is
 * what keeps the type honest rather than a boolean wearing three names.
 */

describe('auth capabilities (S0.5 tri-state, S0.6 web doorway)', () => {
  it('native has a working Google doorway', () => {
    // 'full' is what makes _layout.tsx configure the native SDK; anything else silently disables
    // Google sign-in on the shipping app.
    expect(nativeCapabilities.google).toBe('full');
  });

  it('the web preview has a real Google doorway since S0.6', () => {
    // Was 'cosmetic' (S0.5): the button rendered and a tap explained that Google worked in the app
    // instead. The founder reversed that call — the preview should work, not just look right — and
    // this is the flag that carries it. `_layout.tsx` reads it to install the GIS script.
    expect(webCapabilities.google).toBe('full');
  });

  it('both platforms render the button and install a doorway — a different one each', () => {
    // The two questions the old boolean conflated, asserted as the call sites ask them. They agree
    // today; the type keeps them separable, which is what let S0.5 ship a rendered-but-dead button
    // and S0.6 flip only the half that changed.
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
    // The bug this pins: `googleSignInConfig.ts` imports `configureGoogleSignIn` from the *forked*
    // repository, and before S0.6 only `.native.ts` exported it. Harmless while web was 'cosmetic'
    // (the `=== 'full'` gate meant `_layout.tsx` never called it) — and a startup crash, white
    // screen, on the first render, the moment the flag flipped. Flipping the capability without
    // this function was the trap; the gate stays, what it gates forks.
    //
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const web = require('../src/repositories/authRepository.web');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const native = require('../src/repositories/authRepository.native');

    expect(typeof web.configureGoogleSignIn).toBe('function');
    // Asserted against native rather than alone: the contract is "whatever googleSignInConfig calls
    // exists on both", and naming both sides is what makes a future third platform's omission fail
    // here rather than in a browser.
    expect(typeof native.configureGoogleSignIn).toBe('function');
  });

  it('web signInWithGoogle throws rather than dead-clicking if ever reached', async () => {
    // Unreachable by design on web — GIS owns the click, so the button never calls this. If a
    // future screen rendered our own button instead, the failure must be loud: a no-op here would
    // present as a dead click, which is the exact thing S0.5 refused to ship and S0.6 finished.
    //
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { authRepository, AuthError } = require('../src/repositories/authRepository.web');

    const error = await authRepository.signInWithGoogle().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AuthError);
    expect((error as { code: string }).code).toBe('AUTH_GOOGLE_WEB_WRONG_ENTRY');
  });
});
