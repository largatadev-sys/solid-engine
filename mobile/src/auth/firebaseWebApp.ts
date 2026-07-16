import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

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

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(
      `${name} is not set. The web preview needs the largata-dev project's Web App config ` +
        '(Firebase console → Project settings → Your apps → Web app). See mobile/.env.example.',
    );
  }
  return value;
}

/**
 * The initialized `Auth` instance. Lazy and memoized, deliberately: initializing at module scope
 * would run on import — including inside Jest, where no config exists and nothing wants a live SDK.
 */
export function webAuth(): Auth {
  if (app === undefined) {
    app = initializeApp({
      apiKey: required('EXPO_PUBLIC_FIREBASE_API_KEY'),
      authDomain: required('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
      projectId: required('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
      appId: required('EXPO_PUBLIC_FIREBASE_APP_ID'),
    });
  }
  return getAuth(app);
}
