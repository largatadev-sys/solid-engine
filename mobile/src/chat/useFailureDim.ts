import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { chatMetrics, chatMotion } from '../theme/workspaceTokens';


export function useFailureDim(failed: boolean): Animated.Value {
  const opacity = useRef(new Animated.Value(failed ? chatMetrics.failedOpacity : 1)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: failed ? chatMetrics.failedOpacity : 1,
      duration: chatMotion.stateChangeMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [failed, opacity]);

  return opacity;
}
