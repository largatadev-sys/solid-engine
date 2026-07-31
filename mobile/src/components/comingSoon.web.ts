import { track } from '../analytics/track';
import { COMING_SOON_TAPPED, comingSoonMessage, type ComingSoonSurface } from './comingSoonMessage';


export function comingSoon(surface: ComingSoonSurface): void {
  track(COMING_SOON_TAPPED, { surface });
  const { title, body } = comingSoonMessage(surface);
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(`${title}\n\n${body}`);
  }
}
