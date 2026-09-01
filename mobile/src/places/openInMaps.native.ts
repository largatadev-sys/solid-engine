import { Linking } from 'react-native';


export function openInMaps(url: string): void {
  void Linking.openURL(url);
}
