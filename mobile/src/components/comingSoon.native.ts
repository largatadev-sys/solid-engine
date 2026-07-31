import { Alert } from 'react-native';
import { track } from '../analytics/track';
import { COMING_SOON_TAPPED, comingSoonMessage, type ComingSoonSurface } from './comingSoonMessage';


export function comingSoon(surface: ComingSoonSurface): void {
  track(COMING_SOON_TAPPED, { surface });
  const { title, body } = comingSoonMessage(surface);
  Alert.alert(title, body);
}
