import { createContext, useContext } from 'react';

export type AuthState =
  | { kind: 'restoring' }
  | { kind: 'signedOut' }
  | { kind: 'signedIn'; firebaseUid: string; emailVerified: boolean };

export const AuthContext = createContext<AuthState>({ kind: 'restoring' });

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
