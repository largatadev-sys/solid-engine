import auth from '@react-native-firebase/auth';
import { setTokenSource } from './tokenSource';

/**
 * Wires Firebase in as the app's token source. Called once, at app start.
 *
 * `getIdToken()` is deliberately called per request rather than cached by us: the native SDK holds
 * the token, knows its expiry, and refreshes it transparently when it is close to stale. Caching a
 * copy here would mean sending a token the SDK has already replaced — the classic "works until it
 * has been open for an hour" bug.
 */
export function installFirebaseTokenSource(): void {
  setTokenSource(async () => {
    const user = auth().currentUser;
    if (user === null) return null;
    return user.getIdToken();
  });
}
