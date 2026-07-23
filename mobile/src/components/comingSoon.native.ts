import { Alert } from 'react-native';
import { comingSoonMessage } from './comingSoonMessage';

/**
 * A graceful "not yet" for an affordance the mock shows but whose story hasn't shipped — native fork
 * (S1.3, ticket 05). The S0.5 cosmetic-button pattern: a disabled control tells the traveler what is
 * coming, never a dead tap.
 *
 * <p><strong>Platform-forked because {@code Alert.alert} is a no-op on react-native-web</strong> —
 * literally {@code static alert() {}} in its source. A single shared implementation meant every greyed
 * control in the browser was a dead click: the exact thing this helper exists to prevent, working on
 * the device and silently broken on the web. Found by eyeballing the preview, not by any test.
 */
export function comingSoon(what: string): void {
  const { title, body } = comingSoonMessage(what);
  Alert.alert(title, body);
}
