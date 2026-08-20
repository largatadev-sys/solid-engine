import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable } from 'react-native';
import { tripTabMotion } from '../theme/workspaceTokens';


export type PressFeedback = {
  opacity: Animated.Value;
  onPressIn: () => void;
  onPressOut: () => void;
};


export function usePressFeedback(): PressFeedback {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => () => opacity.stopAnimation(), [opacity]);

  const settle = (toValue: number, duration: number) =>
    Animated.timing(opacity, {
      toValue,
      duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

  return {
    opacity,
    onPressIn: () => settle(tripTabMotion.pressedOpacity, tripTabMotion.pressInMs),
    onPressOut: () => settle(1, tripTabMotion.pressOutMs),
  };
}


export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
