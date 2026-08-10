import { useEffect } from 'react';
import { BackHandler } from 'react-native';


export function useExitGuard(armed: boolean, onExitAttempt: () => void): void {
  useEffect(() => {
    if (!armed) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onExitAttempt();
      return true;
    });
    return () => subscription.remove();
  }, [armed, onExitAttempt]);
}
