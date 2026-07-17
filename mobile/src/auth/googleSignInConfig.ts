import { configureGoogleSignIn } from '../repositories/authRepository';

/**
 * Configures Google sign-in from environment config, once, at app start.
 *
 * <p><strong>One call site, two doorways (S0.6).</strong> `_layout.tsx` calls this whenever the
 * platform declares `authCapabilities.google === 'full'`, and what gets configured forks with the
 * platform: native wires the Google SDK that opens the account picker, web retains the client id for
 * the GIS script that renders Google's button. Same client id, same moment, same gate — which is why
 * this file has no platform fork of its own and does not know there is one below it.
 *
 * <p>The web client id lives in `google-services.json` (gitignored — it is environment config, spec
 * decision 4), and Firebase auto-creates it when Google sign-in is enabled in the console. It is
 * read here via `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` rather than by parsing that file: the same value
 * has to reach the web preview (which has no such JSON), any future iOS build (a plist, not this
 * JSON), and any future environment — so an env var is the shape that survives, and `.env` is
 * already this project's home for machine and environment config.
 *
 * <p>Not a secret: an OAuth client id is public by construction (it ships in every APK, and in every
 * web bundle). It is gitignored config for the same reason as the rest of `google-services.json` —
 * per-environment, not per-repo.
 *
 * <p>If it is missing, this throws at startup rather than at the first tap on "Continue with
 * Google": a misconfigured build should fail loudly and immediately, not look fine until someone
 * tries to sign in and gets an unexplained failure at the token exchange.
 */
export function installGoogleSignIn(): void {
  // Direct static access, not process.env[name]: Expo inlines EXPO_PUBLIC_* on web by literal text
  // substitution, and a computed key is invisible to that pass — it would survive into the bundle
  // and evaluate to undefined in the browser (S0.4 gotcha). Harmless-looking indirection here would
  // mean the preview's Google button silently never configures.
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  if (webClientId === undefined || webClientId === '') {
    throw new Error(
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set. Copy it from google-services.json ' +
        '(client[0].oauth_client, the entry with client_type 3) into mobile/.env — see README. ' +
        'The web preview reads the same value as a Docker build arg (Dockerfile.web-preview).',
    );
  }

  configureGoogleSignIn(webClientId);
}
