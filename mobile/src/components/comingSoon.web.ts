import { comingSoonMessage } from './comingSoonMessage';


export function comingSoon(what: string): void {
  const { title, body } = comingSoonMessage(what);
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(`${title}\n\n${body}`);
  }
}
