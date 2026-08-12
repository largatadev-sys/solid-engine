import { Vibration } from 'react-native';

const LIGHT_MS = 12;


export function lightHaptic(): void {
  Vibration.vibrate(LIGHT_MS);
}
