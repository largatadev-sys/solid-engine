import {
  confirmDestructiveMessage,
  type ConfirmWith,
} from './confirmDestructiveMessage';

/**
 * Asks before something irreversible — web fork (S1.3).
 *
 * <p>{@code Alert.alert} is a no-op on react-native-web, so the native fork's dialog never renders in
 * a browser and its {@code onPress} callback never fires: the delete silently does nothing. The
 * browser's own {@code window.confirm} is the honest equivalent — modal, and it returns the answer.
 *
 * <p>Guarded on {@code window} like {@code comingSoon.web}: without a DOM this degrades to <em>not</em>
 * performing the destructive action, which is the safe direction to fail.
 */

/**
 * The general form (S1.5). `window.confirm` takes one string and labels its own buttons, so the
 * wording's title and body are joined and the `confirmLabel` cannot be shown — which is exactly why
 * the label lives in the shared wording module: the *word* stays identical across platforms even where
 * the browser will not render it, so the two dialogs never diverge in what they claim.
 *
 * Annotated with {@link ConfirmWith} so this fork is typechecked against the native one's contract
 * (`moduleSuffixes` resolves to `.native`, so nothing else would catch drift here).
 */
export const confirmWith: ConfirmWith = (wording, onConfirm) => {
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    if (window.confirm(`${wording.title}\n\n${wording.body}`)) onConfirm();
  }
};

export function confirmDestructive(what: string, onConfirm: () => void): void {
  confirmWith(confirmDestructiveMessage(what), onConfirm);
}
