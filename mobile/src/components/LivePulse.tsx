import { useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from './useReducedMotion';
import { liveUpdateMotion } from '../theme/workspaceTokens';


export function LivePulse({ style }: { readonly style?: StyleProp<ViewStyle> }) {
  const breath = useRef(new Animated.Value(1)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      breath.setValue(1);
      return;
    }

    const cycle = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 0,
          duration: liveUpdateMotion.pulseOutMs,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 1,
          duration: liveUpdateMotion.pulseInMs,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    cycle.start();

    return () => cycle.stop();
  }, [breath, reducedMotion]);

  const opacity = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [liveUpdateMotion.pulseFloorOpacity, 1],
  });

  const scale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [liveUpdateMotion.pulseFloorScale, 1],
  });

  return <Animated.View style={[style, { opacity, transform: [{ scale }] }]} />;
}
