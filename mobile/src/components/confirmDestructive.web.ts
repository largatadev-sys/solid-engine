import { confirmDestructiveMessage } from './confirmDestructiveMessage';

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
export function confirmDestructive(what: string, onConfirm: () => void): void {
  const { title, body } = confirmDestructiveMessage(what);
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    if (window.confirm(`${title}\n\n${body}`)) onConfirm();
  }
}
