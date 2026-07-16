import { setTokenSource } from './tokenSource';
import { webAuth } from './firebaseWebApp';

/**
 * The web twin of `firebaseTokenSource.native.ts` — founders' preview only (S0.4).
 *
 * Same contract, same reasoning: `getIdToken()` per request rather than a cached copy, because the
 * SDK holds the token, knows its expiry, and refreshes it transparently. Caching here would send a
 * token the SDK had already replaced — the "works until the tab has been open an hour" bug.
 *
 * The only real difference from native is shape: the JS SDK exposes `currentUser` on the `Auth`
 * instance and `getIdToken()` as a method on the user, where RNFirebase hangs both off `auth()`.
 * Everything above `setTokenSource` is identical and unaware.
 */
export function installFirebaseTokenSource(): void {
  setTokenSource(async () => {
    const user = webAuth().currentUser;
    if (user === null) return null;
    return user.getIdToken();
  });
}
