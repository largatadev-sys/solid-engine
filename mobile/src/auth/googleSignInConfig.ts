import { configureGoogleSignIn } from '../repositories/authRepository';


export function installGoogleSignIn(): void {
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
