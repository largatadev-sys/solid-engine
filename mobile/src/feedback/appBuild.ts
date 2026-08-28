import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type ReportPlatform = 'android' | 'ios' | 'web';


export function appVersion(): string {
  return Constants.expoConfig?.version ?? 'unknown';
}


export function reportPlatform(): ReportPlatform {
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'ios') return 'ios';
  return 'web';
}
