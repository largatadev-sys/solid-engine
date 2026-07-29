import {
  confirmDestructiveMessage,
  type ConfirmWith,
} from './confirmDestructiveMessage';




export const confirmWith: ConfirmWith = (wording, onConfirm) => {
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    if (window.confirm(`${wording.title}\n\n${wording.body}`)) onConfirm();
  }
};

export function confirmDestructive(what: string, onConfirm: () => void): void {
  confirmWith(confirmDestructiveMessage(what), onConfirm);
}
