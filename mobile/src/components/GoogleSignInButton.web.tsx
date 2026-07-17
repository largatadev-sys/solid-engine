import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import {
  GIS_UNAVAILABLE_MESSAGE,
  handleGoogleCredential,
} from '../auth/googleCredentialHandler';
import { renderButton } from '../auth/googleIdentityServices';
import type { GoogleSignInButtonProps } from './googleSignInButtonContract';

/**
 * The Google doorway's button on web — rendered by Google Identity Services (S0.6).
 *
 * <p><strong>Why Google renders it and we do not.</strong> Founder call at the S0.6 grilling: the
 * genuine button is the trust cue at the moment of credential entry, and GIS hands back an ID token
 * directly. The cost — its iframe ignores our design tokens — was accepted because the current
 * palette is a placeholder anyway (visual-direction backlog item, due before E4).
 *
 * <p><strong>This file is wiring; the decisions live in `googleCredentialHandler`.</strong> GIS
 * breaks the shape every other action in this app has: <em>it</em> owns the click, so the credential
 * arrives in a callback with no promise for the screen's `run()` to await, and something has to
 * reproduce busy/try/translate/settle by hand. That something is testable logic and lives in a
 * module (this repo tests no components — jest.config.js). What is left here is what a component
 * should be: a host element, an effect, and props passed through.
 */

/**
 * Web uses `onStart`/`onSettle`/`onError`/`disabled`; `onPress` and `busy` are native's half of the
 * shared contract — GIS owns the click here and draws its own button inside an iframe we cannot
 * reach into, so there is nowhere to put a spinner. See the contract file.
 */
/**
 * GIS's rendered width, in px.
 *
 * <p>400 is GIS's documented maximum — it ignores anything larger. The sign-in screen's fields are
 * 420 (`FIELD_MAX_WIDTH`), so the button is 20px narrower than the form on a wide viewport and there
 * is no way to close that: the button is Google's iframe, not ours. It is close enough to read as
 * aligned, and it is only visible above ~420px anyway (below that the form is narrower than both).
 * Stated rather than silently accepted, because "why is this 400 and not 420" is otherwise a
 * question someone re-answers by experiment.
 */
const GIS_BUTTON_WIDTH = 400;

export function GoogleSignInButton({
  onStart,
  onSettle,
  onError,
  disabled,
}: GoogleSignInButtonProps) {
  const host = useRef<View | null>(null);

  // Props behind a ref, and the effect runs once: GIS registers one callback for the page's life
  // and a founder can sit in the account chooser for a minute, so the handler must read the current
  // props rather than the ones it closed over. `disabled` especially — as a captured boolean it
  // would be a guard that stops working the moment it matters.
  const latest = useRef({ onStart, onSettle, onError, disabled });
  latest.current = { onStart, onSettle, onError, disabled };

  useEffect(() => {
    // react-native-web renders View to a div, and renderButton needs that DOM node. Cast through
    // unknown because RN's View type says nothing about the DOM — true on native, where this file
    // never runs.
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
      // GIS_BUTTON_WIDTH, not a measurement of the host: the effect runs before layout, so
      // getBoundingClientRect() reports 0 here and GIS silently falls back to sizing-to-label —
      // a narrow button floating above a full-width form, which is exactly what it did on the
      // first attempt (the giveaway was the absent `width` param in the /gsi/button request).
    }, GIS_BUTTON_WIDTH).catch(() => {
      // load() rejected: a blocked CDN, an offline founder, or a build with no client id. Reported
      // where every other auth failure is reported, rather than leaving a button-shaped gap with no
      // explanation.
      if (!unmounted) latest.current.onError(GIS_UNAVAILABLE_MESSAGE);
    });

    return () => {
      unmounted = true;
    };
  }, []);

  // The host Google renders into. Nothing of ours paints here, and no `pointerEvents` gate: GIS's
  // iframe owns its own clicks, so styling cannot enforce `disabled` — the handler does, at the
  // moment the credential lands. A gate here would be decoration that reads like a guard.
  return <View ref={host} />;
}
