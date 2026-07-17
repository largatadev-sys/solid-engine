/**
 * The Google button's prop contract — the half that is not platform-specific (S0.6).
 *
 * <p><strong>Why a contract file rather than props declared twice.</strong> Same reasoning as
 * `authContract.ts`, which this deliberately mirrors: `GoogleSignInButton` has two implementations
 * (`.native.tsx` renders Google's RN component, `.web.tsx` hosts the GIS iframe), Metro picks one
 * per platform, and `sign-in.tsx` cannot tell which it got. If each file declared its own props,
 * the screen would be typechecked against whichever resolved first — and the other platform's
 * mismatch would surface as a runtime nothing, on the platform nobody was looking at.
 *
 * <p><strong>Why every prop is on both sides even though each uses a subset.</strong> The two
 * platforms' doorways have different *shapes*, not different *needs*: native pulls (its `onPress`
 * awaits `signInWithGoogle()`, and the screen's `run()` wraps it in busy/message state), while web
 * pushes (GIS owns the click and delivers a credential to a callback, so the component drives that
 * same state itself). The screen's job — "offer this doorway, show me busy, tell me what went
 * wrong" — is identical either way. Both implementations therefore accept the full contract and use
 * what their shape requires; the alternative, a union the screen narrows by platform, would put
 * `Platform.OS` back in UI code that S0.5 worked to get it out of.
 */
export interface GoogleSignInButtonProps {
  /**
   * Native's entry point: run the sign-in and own the whole lifecycle (the screen's
   * `run('google', …)`). Unused on web — GIS owns its own click, so nothing calls this there.
   */
  readonly onPress: () => void;

  /**
   * Web's "a credential arrived, the exchange is running": marks the screen busy and clears any
   * stale message. Unused on native, where `run()` already does both around `onPress`.
   */
  readonly onStart: () => void;

  /** Web's "the exchange finished, success or not" — the counterpart to `run()`'s `finally`. */
  readonly onSettle: () => void;

  /**
   * Web's failure path: a founder-readable sentence for the screen's one message slot. Native
   * failures travel through `run()`'s catch instead, arriving at the same place.
   */
  readonly onError: (message: string) => void;

  /** Both: the screen is busy with some other action; the doorway should not accept a second one. */
  readonly disabled: boolean;

  /**
   * Native: this doorway's own sign-in is in flight — show a spinner in place of the label.
   *
   * Unused on web, and not for want of trying: GIS draws the button inside an iframe we cannot
   * reach into, so a spinner would have to sit outside it and would read as a second control. The
   * web button's in-flight signal is the screen's own message area plus the popup Google itself
   * shows.
   *
   * Distinct from `disabled` (which means *something else* is busy): both are true during a Google
   * sign-in, only `disabled` is true during an email one.
   */
  readonly busy: boolean;
}
