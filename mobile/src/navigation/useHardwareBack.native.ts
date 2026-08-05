import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';


export function useHardwareBack(onBack: (() => void) | undefined): void {
  useFocusEffect(
    useCallback(() => {
      if (onBack === undefined) return undefined;

      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        onBack();
        return true;
      });
      return () => subscription.remove();
    }, [onBack]),
  );
}
