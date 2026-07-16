import { setTokenSource } from './tokenSource';
import { getValidIdToken } from './firebaseWebRest';

/**
 * The web twin of `firebaseTokenSource.native.ts` — founders' preview only (S0.4), on the REST
 * session store rather than the Firebase JS SDK.
 *
 * Same contract: a valid ID token per request, refreshed on demand and never cached past its life.
 * `getValidIdToken` owns the refresh (it exchanges the refresh token at the securetoken endpoint
 * when the current token is near expiry), so this stays a one-liner and everything above
 * `setTokenSource` is identical to native and unaware of the platform.
 */
export function installFirebaseTokenSource(): void {
  setTokenSource(() => getValidIdToken());
}
