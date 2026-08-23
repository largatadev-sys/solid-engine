import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authRepository } from '../repositories/authRepository';
import { authStateOf, onViewerChanged, viewerChanged } from '../query/viewerScopedCache';
import { AuthContext, type AuthState } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ kind: 'restoring' });
  const client = useQueryClient();
  const previous = useRef<AuthState>(state);

  useEffect(() => {
    return authRepository.onAuthStateChanged((user) => {
      const next = authStateOf(user);

      if (viewerChanged(previous.current, next)) onViewerChanged(client);
      previous.current = next;

      setState(next);
    });
  }, [client]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
