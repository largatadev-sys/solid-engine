import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authRepository } from '../repositories/authRepository';


export type AuthState =
  | { kind: 'restoring' }
  | { kind: 'signedOut' }
  | { kind: 'signedIn'; firebaseUid: string };

const AuthContext = createContext<AuthState>({ kind: 'restoring' });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ kind: 'restoring' });

  useEffect(() => {
    return authRepository.onAuthStateChanged((user) => {
      setState(user === null ? { kind: 'signedOut' } : { kind: 'signedIn', firebaseUid: user.uid });
    });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
