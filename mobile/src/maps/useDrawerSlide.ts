import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';


export const DRAWER_IN_MS = 260;

export const DRAWER_OUT_MS = 200;


export interface DrawerSlide {
  readonly mounted: boolean;
  readonly translateY: Animated.Value;
  readonly scrim: Animated.Value;
}


export function useDrawerSlide(visible: boolean, travel: number): DrawerSlide {
  const translateY = useRef(new Animated.Value(travel)).current;
  const scrim = useRef(new Animated.Value(0)).current;

  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      translateY.setValue(travel);
      scrim.setValue(0);
      setMounted(true);
      return;
    }

    if (!mounted) return;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: travel,
        duration: DRAWER_OUT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scrim, {
        toValue: 0,
        duration: DRAWER_OUT_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, travel, translateY, scrim, mounted]);

  useEffect(() => {
    if (!visible || !mounted) return;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: DRAWER_IN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scrim, {
        toValue: 1,
        duration: DRAWER_IN_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, mounted, translateY, scrim]);

  return { mounted, translateY, scrim };
}
