import { useEffect, useSyncExternalStore } from 'react';
import {
  pendingJoinToken,
  restorePendingJoin,
  subscribeToPendingJoin,
} from './pendingJoinStore';


export function usePendingJoin(): string | null {
  const token = useSyncExternalStore(subscribeToPendingJoin, pendingJoinToken, pendingJoinToken);

  useEffect(() => {
    void restorePendingJoin();
  }, []);

  return token;
}
