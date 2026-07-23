import { Alert } from 'react-native';
import { confirmDestructiveMessage } from './confirmDestructiveMessage';

/**
 * Asks before something irreversible — native fork (S1.3).
 *
 * <p><strong>Platform-forked for the reason {@code comingSoon} is:</strong> {@code Alert.alert} is a
 * no-op on react-native-web, and a confirm that never renders is worse than a missing one — the
 * action's callback lives inside the alert's button array, so on the web the delete silently *never
 * happened*. That is what shipped until the whole-branch review caught it: `comingSoon` was forked
 * and these call sites were left behind, so deleting a day or an activity was unusable in the browser.
 *
 * @param what names the thing being deleted, e.g. `Day 2` or `"Airport Transfer"`
 * @param onConfirm runs only if the traveler confirms
 */
export function confirmDestructive(what: string, onConfirm: () => void): void {
  const { title, body } = confirmDestructiveMessage(what);
  Alert.alert(title, body, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}
