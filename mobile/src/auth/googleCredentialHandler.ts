import { AuthError } from '../repositories/authContract';
import { signInWithGoogleCredential } from '../repositories/authRepository.web';

/**
 * What happens between "Google handed us a credential" and "the screen knows how it went" (S0.6).
 *
 * <p><strong>Why this is not inside the button component.</strong> The spec calls this inch the
 * reason the story exists — *"a founder who completes the Google popup and then sees nothing is the
 * dead-click failure this story exists to prevent"* — and it is the one piece of push-shaped control
 * flow in the app: GIS owns the click, so nothing returns a promise for the screen's `run()` to
 * await, and this code has to reproduce what `run()` does (busy, try, translate, settle) by hand.
 * That makes it worth testing, and this repo deliberately tests no components (jest.config.js: "no
 * component-snapshot theatre" — 06b §7). Extracting the decisions leaves the component as wiring
 * and puts the logic somewhere a test can reach without a new dependency or a reversal of that
 * decision. The component draws; this decides.
 *
 * <p><strong>Web only</strong> — native's doorway returns its credential to the caller, so its
 * button needs none of this.
 */

/** The screen's half of the contract, as this module needs it — the button passes them through. */
export interface CredentialHandlerCallbacks {
  readonly onStart: () => void;
  readonly onSettle: () => void;
  readonly onError: (message: string) => void;
  /** Read at credential time, not at mount: see `handleGoogleCredential`. */
  readonly isDisabled: () => boolean;
}

/**
 * Exchanges a Google credential for a session, driving the screen's busy/message state around it.
 *
 * <p><strong>The `isDisabled` guard is not belt-and-braces.</strong> GIS renders its button into a
 * cross-origin iframe, which handles its own clicks — `pointerEvents: 'none'` on our host element
 * does not reliably stop one getting through, so "disabled" cannot be enforced by styling. It has to
 * be enforced here, when the credential lands. Without it, a founder mid-email-sign-in can start a
 * second one: `onStart` would stomp `busy = 'email'` and two sign-ins would race for one session.
 *
 * <p>It is a callback rather than a boolean because GIS registers one callback for the page's life:
 * a captured `disabled` would be the value at mount, forever. Reading it at credential time is the
 * difference between a guard and a decoration.
 *
 * <p>Silent when disabled, by design: the screen is already busy with something the founder started,
 * so there is nothing to tell them. That is the one place silence is right here — every other path
 * ends in a sentence.
 */
export async function handleGoogleCredential(
  idToken: string,
  callbacks: CredentialHandlerCallbacks,
): Promise<void> {
  if (callbacks.isDisabled()) return;

  callbacks.onStart();
  try {
    await signInWithGoogleCredential(idToken);
    // Nothing navigates here on success: the auth listener owns routing, exactly as it does for
    // email. A screen that also routed would be a second source of truth for "am I signed in".
  } catch (error) {
    // The repository's contract is that it throws exactly one type; anything else is a bug in that
    // layer, and surfacing it raw would hide it. Same shape as sign-in.tsx's own catch.
    callbacks.onError(
      error instanceof AuthError ? error.message : 'Sign-in failed. Please try again.',
    );
  } finally {
    callbacks.onSettle();
  }
}

/** What a founder is told when Google's script never arrives (blocked CDN, offline, no client id). */
export const GIS_UNAVAILABLE_MESSAGE =
  'Google sign-in is unavailable right now. Use email, or try again.';
