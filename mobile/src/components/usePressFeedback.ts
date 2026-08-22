import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable } from 'react-native';
import { tripTabMotion } from '../theme/workspaceTokens';


export type PressFeedback = {
  opacity: Animated.Value;
  style: { opacity: Animated.Value; transform: [{ scale: Animated.Value }] };
  onPressIn: () => void;
  onPressOut: () => void;
};


export function usePressFeedback(): PressFeedback {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(
    () => () => {
      opacity.stopAnimation();
      scale.stopAnimation();
    },
    [opacity, scale],
  );

  const settle = (toOpacity: number, duration: number, toScale: number, stiffness: number) => {
    Animated.timing(opacity, {
      toValue: toOpacity,
      duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    Animated.spring(scale, {
      toValue: toScale,
      stiffness,
      damping: tripTabMotion.pressDamping,
      mass: tripTabMotion.pressMass,
      useNativeDriver: true,
    }).start();
  };

  return {
    opacity,
    style: { opacity, transform: [{ scale }] },
    onPressIn: () =>
      settle(
        tripTabMotion.pressedOpacity,
        tripTabMotion.pressInMs,
        tripTabMotion.pressedScale,
        tripTabMotion.pressInStiffness,
      ),
    onPressOut: () =>
      settle(1, tripTabMotion.pressOutMs, 1, tripTabMotion.pressOutStiffness),
  };
}


export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
