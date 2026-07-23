import { comingSoonMessage } from './comingSoonMessage';

/**
 * A graceful "not yet" — web fork (S1.3, ticket 05).
 *
 * <p><strong>Why this fork exists.</strong> React Native's {@code Alert.alert} is a <em>no-op</em> on
 * react-native-web (its source is literally {@code static alert() {}}), so the shared implementation
 * made every greyed control in the browser a dead click — the precise failure the grey-out AC forbids,
 * invisible on the device and invisible to every test. The browser's own {@code window.alert} is the
 * honest equivalent: modal, dismissible, and impossible to miss.
 *
 * <p>Guarded on {@code window} rather than assumed: this module is bundled for the web, but a
 * server-side render or a test environment without a DOM should degrade to silence, not to a crash.
 */
export function comingSoon(what: string): void {
  const { title, body } = comingSoonMessage(what);
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(`${title}\n\n${body}`);
  }
}
