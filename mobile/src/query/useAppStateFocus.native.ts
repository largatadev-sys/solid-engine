import { focusManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export function isAppFocused(state: AppStateStatus): boolean {
  return state === 'active';
}


export function useAppStateFocus(): void {
  useEffect(() => {
    focusManager.setFocused(isAppFocused(AppState.currentState));

    const subscription = AppState.addEventListener('change', (next) => {
      focusManager.setFocused(isAppFocused(next));
    });

    return () => {
      subscription.remove();
      focusManager.setFocused(undefined);
    };
  }, []);
}
