import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authRepository } from '../repositories/authRepository';

/**
 * Who is signed in, as the UI sees it.
 *
 * `restoring` is a distinct state, not `signedOut` with a flag: at app start the native SDK has a
 * cached session but has not yet told us about it. Collapsing the two would flash the sign-in
 * screen at every launch for an already-signed-in traveler.
 */
export type AuthState =
  | { kind: 'restoring' }
  | { kind: 'signedOut' }
  | { kind: 'signedIn'; firebaseUid: string };

const AuthContext = createContext<AuthState>({ kind: 'restoring' });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ kind: 'restoring' });

  useEffect(() => {
    // Fires once with the restored session, then on every sign-in/sign-out. The unsubscribe
    // matters: a listener surviving a hot reload would leak and double-fire.
    return authRepository.onAuthStateChanged((user) => {
      setState(user === null ? { kind: 'signedOut' } : { kind: 'signedIn', firebaseUid: user.uid });
    });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
