import { useEffect } from 'react';
import { AppState } from 'react-native';

import { disconnect, reconnectIfDead } from './connection';

export function useSocketLifecycle(signedIn: boolean): void {
  useEffect(() => {
    if (!signedIn) {
      disconnect();
      return;
    }

    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') reconnectIfDead();
    });

    return () => {
      subscription.remove();
    };
  }, [signedIn]);
}
