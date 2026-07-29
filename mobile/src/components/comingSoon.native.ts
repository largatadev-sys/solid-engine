import { Alert } from 'react-native';
import { comingSoonMessage } from './comingSoonMessage';


export function comingSoon(what: string): void {
  const { title, body } = comingSoonMessage(what);
  Alert.alert(title, body);
}
