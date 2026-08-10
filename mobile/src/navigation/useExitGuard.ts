import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/build/react-navigation/core';


export function useExitGuard(armed: boolean, onExitAttempt: (proceed: () => void) => void): void {
  const navigation = useNavigation();

  usePreventRemove(armed, ({ data }) => {
    onExitAttempt(() => navigation.dispatch(data.action));
  });
}
