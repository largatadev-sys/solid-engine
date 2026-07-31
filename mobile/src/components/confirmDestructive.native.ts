import { Alert } from 'react-native';
import {
  confirmDestructiveMessage,
  type ConfirmWith,
} from './confirmDestructiveMessage';




export const confirmWith: ConfirmWith = (wording, onConfirm) => {
  Alert.alert(wording.title, wording.body, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: wording.confirmLabel,
      style: wording.tone === 'default' ? 'default' : 'destructive',
      onPress: onConfirm,
    },
  ]);
};


export function confirmDestructive(what: string, onConfirm: () => void): void {
  confirmWith(confirmDestructiveMessage(what), onConfirm);
}
