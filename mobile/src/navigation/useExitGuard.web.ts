import { useEffect } from 'react';


export function useExitGuard(armed: boolean, onExitAttempt: () => void): void {
  useEffect(() => {
    if (!armed || typeof window === 'undefined') return;

    window.history.pushState(null, '', window.location.href);
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
      onExitAttempt();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [armed, onExitAttempt]);
}
