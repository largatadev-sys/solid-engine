import type { QueryClient } from '@tanstack/react-query';
import type { AuthState } from '../hooks/authContext';
import type { AuthUser } from '../repositories/authContract';


type ViewerIdentity = string | null;


export function authStateOf(user: AuthUser | null): AuthState {
  return user === null
    ? { kind: 'signedOut' }
    : { kind: 'signedIn', firebaseUid: user.uid, emailVerified: user.emailVerified };
}


export function viewerIdentityOf(state: AuthState): ViewerIdentity {
  return state.kind === 'signedIn' ? state.firebaseUid : null;
}


export function viewerChanged(before: AuthState, after: AuthState): boolean {
  if (before.kind === 'restoring' || after.kind === 'restoring') return false;
  return viewerIdentityOf(before) !== viewerIdentityOf(after);
}


export function onViewerChanged(client: QueryClient): void {
  client.clear();
}
