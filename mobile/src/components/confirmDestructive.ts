import { askForConfirmation } from './ConfirmStation';
import {
  confirmDestructiveMessage,
  type ConfirmWith,
} from './confirmDestructiveMessage';


export const confirmWith: ConfirmWith = (wording, onConfirm) => {
  askForConfirmation(wording, onConfirm);
};


export function confirmDestructive(what: string, onConfirm: () => void): void {
  confirmWith(confirmDestructiveMessage(what), onConfirm);
}
