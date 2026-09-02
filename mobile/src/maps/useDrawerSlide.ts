import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';


export const DRAWER_IN_MS = 260;

export const DRAWER_OUT_MS = 200;


export function useDrawerSlide(visible: boolean, travel: number): {
  readonly translateY: Animated.Value;
  readonly scrim: Animated.Value;
} {
  const translateY = useRef(new Animated.Value(travel)).current;
  const scrim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const slide = Animated.timing(translateY, {
      toValue: visible ? 0 : travel,
      duration: visible ? DRAWER_IN_MS : DRAWER_OUT_MS,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    const fade = Animated.timing(scrim, {
      toValue: visible ? 1 : 0,
      duration: visible ? DRAWER_IN_MS : DRAWER_OUT_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    Animated.parallel([slide, fade]).start();
  }, [visible, travel, translateY, scrim]);

  return { translateY, scrim };
}
