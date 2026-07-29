import { editLockedMessage } from './editLockedMessage';


export function editLockedAlert(error: unknown): void {
  const { title, body } = editLockedMessage(error);
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(`${title}\n\n${body}`);
  }
}
