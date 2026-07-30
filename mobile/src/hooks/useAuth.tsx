import { useEffect, useState, type ReactNode } from 'react';
import { authRepository } from '../repositories/authRepository';
import { AuthContext, type AuthState } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ kind: 'restoring' });

  useEffect(() => {
    return authRepository.onAuthStateChanged((user) => {
      setState(
        user === null
          ? { kind: 'signedOut' }
          : { kind: 'signedIn', firebaseUid: user.uid, emailVerified: user.emailVerified },
      );
    });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
