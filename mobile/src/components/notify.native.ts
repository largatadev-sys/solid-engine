import { Alert } from 'react-native';


export function notify(title: string, body: string): void {
  Alert.alert(title, body);
}
