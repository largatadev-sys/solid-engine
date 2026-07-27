import { Alert } from 'react-native';
import {
  confirmDestructiveMessage,
  type ConfirmWith,
} from './confirmDestructiveMessage';

/**
 * Asks before something irreversible — native fork (S1.3).
 *
 * <p><strong>Platform-forked for the reason {@code comingSoon} is:</strong> {@code Alert.alert} is a
 * no-op on react-native-web, and a confirm that never renders is worse than a missing one — the
 * action's callback lives inside the alert's button array, so on the web the delete silently *never
 * happened*. That is what shipped until the whole-branch review caught it: `comingSoon` was forked
 * and these call sites were left behind, so deleting a day or an activity was unusable in the browser.
 */

/**
 * The general form (S1.5): any confirm, with its own wording.
 *
 * Annotated with the shared {@link ConfirmWith} rather than inferred, so the web twin is checked
 * *as a value* against the same contract on the one `tsc` run — the convention `tsconfig.json`'s
 * `moduleSuffixes` comment describes. `moduleSuffixes` resolves imports to `.native` only, so drift
 * between the forks is otherwise invisible to typechecking.
 */
export const confirmWith: ConfirmWith = (wording, onConfirm) => {
  Alert.alert(wording.title, wording.body, [
    { text: 'Cancel', style: 'cancel' },
    { text: wording.confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
};

/**
 * Deleting a named thing — the S1.3 call sites (days, activities) unchanged.
 *
 * @param what names the thing being deleted, e.g. `Day 2` or `"Airport Transfer"`
 * @param onConfirm runs only if the traveler confirms
 */
export function confirmDestructive(what: string, onConfirm: () => void): void {
  confirmWith(confirmDestructiveMessage(what), onConfirm);
}
