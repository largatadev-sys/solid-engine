import { configureGoogleSignIn } from '../repositories/authRepository';

/**
 * Configures Google sign-in from environment config, once, at app start.
 *
 * The web client id lives in `google-services.json` (gitignored — it is environment config, spec
 * decision 4), and Firebase auto-creates it when Google sign-in is enabled in the console. It is
 * read here via `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` rather than by parsing that file: the same value
 * has to reach the iOS build (which uses a plist, not this JSON) and any future environment, so an
 * env var is the shape that survives — and `.env` is already this project's home for machine and
 * environment config.
 *
 * Not a secret: an OAuth client id is public by construction (it ships in every APK). It is
 * gitignored config for the same reason as the rest of `google-services.json` — per-environment,
 * not per-repo.
 *
 * If it is missing, this throws at startup rather than at the first tap on "Continue with Google":
 * a misconfigured build should fail loudly and immediately, not look fine until someone tries to
 * sign in and gets an unexplained failure at the token exchange.
 */
export function installGoogleSignIn(): void {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  if (webClientId === undefined || webClientId === '') {
    throw new Error(
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set. Copy it from google-services.json ' +
        '(client[0].oauth_client, the entry with client_type 3) into mobile/.env — see README.',
    );
  }

  configureGoogleSignIn(webClientId);
}
