import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import {
  GIS_UNAVAILABLE_MESSAGE,
  handleGoogleCredential,
} from '../auth/googleCredentialHandler';
import { renderButton } from '../auth/googleIdentityServices';
import type { GoogleSignInButtonProps } from './googleSignInButtonContract';





const GIS_BUTTON_WIDTH = 400;

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

    void renderButton(element, (idToken: string) => {
      if (unmounted) return;
      void handleGoogleCredential(idToken, {
        onStart: () => latest.current.onStart(),
        onSettle: () => latest.current.onSettle(),
        onError: (message) => latest.current.onError(message),
        isDisabled: () => unmounted || latest.current.disabled,
      });
    }, GIS_BUTTON_WIDTH).catch(() => {
      if (!unmounted) latest.current.onError(GIS_UNAVAILABLE_MESSAGE);
    });

    return () => {
      unmounted = true;
    };
  }, []);

  return <View ref={host} />;
}
