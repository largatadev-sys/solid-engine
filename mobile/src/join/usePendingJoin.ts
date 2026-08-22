import { useEffect, useSyncExternalStore } from 'react';
import {
  pendingJoinSettled,
  pendingJoinToken,
  restorePendingJoin,
  subscribeToPendingJoin,
} from './pendingJoinStore';


export interface PendingJoin {
  readonly token: string | null;
  readonly settled: boolean;
}


export function usePendingJoin(): PendingJoin {
  const token = useSyncExternalStore(subscribeToPendingJoin, pendingJoinToken, pendingJoinToken);
  const settled = useSyncExternalStore(
    subscribeToPendingJoin,
    pendingJoinSettled,
    pendingJoinSettled,
  );

  useEffect(() => {
    void restorePendingJoin();
  }, []);

  return { token, settled };
}
