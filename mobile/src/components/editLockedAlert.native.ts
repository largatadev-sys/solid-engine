import { Alert } from 'react-native';
import { editLockedMessage } from './editLockedMessage';

/**
 * Tells the traveler why an edit surface won't open — native fork (S1.4, ADR-014). Given the error
 * from a failed lock acquire (another member holds it, or the device is offline), it shows the mapped
 * message as a native dialog.
 *
 * <p><strong>Platform-forked because {@code Alert.alert} is a no-op on react-native-web</strong>
 * (literally {@code static alert() {}} in its source) — the exact trap S1.3 hit, where every "not yet"
 * dialog was a silent dead click in the browser. The web fork uses {@code window.alert}; a test
 * intercepts whichever fires. The message wording lives in {@link editLockedMessage} so the two forks
 * cannot drift.
 */
export function editLockedAlert(error: unknown): void {
  const { title, body } = editLockedMessage(error);
  Alert.alert(title, body);
}
