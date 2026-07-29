import { Alert } from 'react-native';
import { editLockedMessage } from './editLockedMessage';


export function editLockedAlert(error: unknown): void {
  const { title, body } = editLockedMessage(error);
  Alert.alert(title, body);
}
