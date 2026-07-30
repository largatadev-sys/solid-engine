import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import {
  GIS_UNAVAILABLE_MESSAGE,
  handleGoogleCredential,
} from '../auth/googleCredentialHandler';
import { renderButton } from '../auth/googleIdentityServices';
import type { GoogleSignInButtonProps } from './googleSignInButtonContract';





const GIS_MIN_WIDTH = 200;
const GIS_MAX_WIDTH = 400;

export function gisButtonWidth(containerWidth: number): number {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return GIS_MAX_WIDTH;

  return Math.max(GIS_MIN_WIDTH, Math.min(GIS_MAX_WIDTH, Math.floor(containerWidth)));
}

export function GoogleSignInButton({
  onStart,
  onSettle,
  onError,
  disabled,
}: GoogleSignInButtonProps) {
  const host = useRef<View | null>(null);

  const latest = useRef({ onStart, onSettle, onError, disabled });
  latest.current = { onStart, onSettle, onError, disabled };

  useEffect(() => {
    const element = host.current as unknown as HTMLElement | null;
    if (element === null) return;

    let unmounted = false;

    const width = gisButtonWidth(element.offsetWidth);

    void renderButton(element, (idToken: string) => {
      if (unmounted) return;
      void handleGoogleCredential(idToken, {
        onStart: () => latest.current.onStart(),
        onSettle: () => latest.current.onSettle(),
        onError: (message) => latest.current.onError(message),
        isDisabled: () => unmounted || latest.current.disabled,
      });
    }, width).catch(() => {
      if (!unmounted) latest.current.onError(GIS_UNAVAILABLE_MESSAGE);
    });

    return () => {
      unmounted = true;
    };
  }, []);

  return <View ref={host} style={{ alignSelf: 'stretch' }} />;
}
