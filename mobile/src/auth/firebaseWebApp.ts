import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  initializeAuth,
  type Auth,
} from 'firebase/auth';

/**
 * Firebase's JS SDK, initialized for the founders' web preview (S0.4) — web-only, and the only
 * file that knows the JS SDK's app object exists.
 *
 * <p><strong>Why config lives in env-vars here, unlike native.</strong> The native builds read
 * `google-services.json`, a gitignored file the Firebase console generates (S0.2, decision 4). The
 * web SDK has no such file — it takes a plain config object — so the same per-environment values
 * arrive the way every other environment value in this repo does: `EXPO_PUBLIC_*` env-vars, baked
 * at export time. Same regime, same reasoning; different transport because the SDKs differ.
 *
 * <p><strong>These values are not secrets</strong>, and it is worth being precise about why, since
 * "apiKey" reads like one. A Firebase web `apiKey` identifies the project to Google's endpoints; it
 * authorizes nothing. It ships inside every web bundle by construction — as the Android client id
 * ships inside every APK — and what actually guards the project is the authorized-domains list and
 * the security rules, not the key's secrecy. It stays in env-vars because it is *per-environment*
 * config (the preview points at `largata-dev`; a future prod web surface would not), which is the
 * same argument `.env.example` already records for the Google web client id. Never-commit-secrets
 * (P3) is untouched: no credential appears here.
 *
 * <p>Missing config throws at startup rather than at the first sign-in tap — a misconfigured build
 * should fail loudly and immediately, the same stance `googleSignInConfig` takes on native.
 */

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;

/**
 * The config, read by DIRECT static member access — `process.env.EXPO_PUBLIC_X`, never
 * `process.env[name]`.
 *
 * <p><strong>This is load-bearing, and a computed lookup silently breaks it</strong> (found at S0.4
 * on the first web export). Expo has no runtime environment on web: it inlines `EXPO_PUBLIC_*` at
 * bundle time by a literal find-and-replace of the exact text `process.env.EXPO_PUBLIC_X`. A
 * `process.env[name]` with a variable key is invisible to that pass, so it survives into the bundle
 * and evaluates against an empty `process.env` in the browser — every value `undefined`, sign-in
 * dead, and no error naming the cause. An earlier version of this file used a `required(name)`
 * helper doing exactly that; it defeated the one mechanism it depended on. Each field must therefore
 * be its own literal access, which is why this reads as a flat object rather than a loop.
 */
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/**
 * The initialized `Auth` instance. Lazy and memoized, deliberately: initializing at module scope
 * would run on import — including inside Jest, where no config exists and nothing wants a live SDK.
 *
 * The presence check lives here rather than at module scope for the same reason: a misconfigured
 * build should fail loudly at first use (which on web is app start), not crash the test runner on
 * import. It still fails *before* the first sign-in tap, not at the opaque token exchange.
 */
export function webAuth(): Auth {
  if (app === undefined) {
    const missing = Object.entries(config)
      .filter(([, value]) => value === undefined || value === '')
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(
        `Web preview Firebase config missing: ${missing.join(', ')}. These are inlined from ` +
          'EXPO_PUBLIC_FIREBASE_* at export time (Firebase console → Project settings → Your apps ' +
          '→ Web app). See mobile/.env.example.',
      );
    }

    app = initializeApp(config);

    // initializeAuth, NOT getAuth — and this is the fix for a white-screen crash, not a style
    // choice (S0.4). getAuth() assumes the auth *component* is already registered on the app, a
    // registration that happens as a side effect of importing `firebase/auth`. Metro's production
    // bundler tree-shakes and reorders aggressively enough that getAuth() can run before that side
    // effect does, throwing "Component auth has not been registered yet" — which surfaces as a blank
    // page, since it crashes at module load before React renders. initializeAuth() performs the
    // registration explicitly, so bundler ordering cannot defeat it.
    //
    // browserLocalPersistence is the web counterpart of the native SDK's automatic session
    // persistence: without it, a founder is signed out on every page refresh (in-memory default).
    authInstance = initializeAuth(app, { persistence: browserLocalPersistence });
  }

  // authInstance is set in the same block as app; getAuth(app) is the correct idempotent accessor
  // once initializeAuth has run, and returns the same instance.
  return authInstance ?? getAuth(app);
}
