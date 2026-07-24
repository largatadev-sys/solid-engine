import { editLockedMessage } from './editLockedMessage';

/**
 * Tells the traveler why an edit surface won't open — web fork (S1.4, ADR-014). The browser's
 * {@code window.alert} is the honest equivalent of the native dialog: modal, dismissible, impossible
 * to miss — and, unlike react-native-web's no-op {@code Alert.alert}, it actually fires (the S1.3
 * lesson this fork exists to honour).
 *
 * <p>Guarded on {@code window} so a DOM-less environment (SSR, a test without a window) degrades to
 * silence rather than a crash. The lock-modal preview check intercepts this call in headless Chrome.
 */
export function editLockedAlert(error: unknown): void {
  const { title, body } = editLockedMessage(error);
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(`${title}\n\n${body}`);
  }
}
