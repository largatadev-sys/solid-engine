import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  cacheBelongsToSomebodyElse,
  observedTravelerOf,
  type ObservedTraveler,
} from '../auth/sessionIdentity';
import { authRepository } from '../repositories/authRepository';
import { AuthContext, type AuthState } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ kind: 'restoring' });
  const client = useQueryClient();
  const observed = useRef<ObservedTraveler>(null);

  useEffect(() => {
    return authRepository.onAuthStateChanged((user) => {
      setState(
        user === null
          ? { kind: 'signedOut' }
          : { kind: 'signedIn', firebaseUid: user.uid, emailVerified: user.emailVerified },
      );
    });
  }, []);

  useEffect(() => {
    const next = observedTravelerOf(state);
    if (next === null) return;

    if (cacheBelongsToSomebodyElse(observed.current, next)) client.clear();
    observed.current = next;
  }, [state, client]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
