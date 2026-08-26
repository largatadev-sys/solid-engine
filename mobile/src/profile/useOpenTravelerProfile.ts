import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useMe } from '../hooks/useMe';
import { ownProfileRoute, publicProfileRoute, travelerDestination } from './travelerRoutes';


export function useOpenTravelerProfile(): (handle: string | null | undefined) => void {
  const router = useRouter();
  const { state } = useMe();
  const viewerHandle = state.kind === 'ok' ? state.me.handle : null;

  return useCallback(
    (handle: string | null | undefined) => {
      const destination = travelerDestination(handle, viewerHandle);

      if (destination.kind === 'nowhere') {
        return;
      }
      if (destination.kind === 'own') {
        router.push(ownProfileRoute());
        return;
      }
      router.push(publicProfileRoute(destination.handle));
    },
    [router, viewerHandle],
  );
}
