import { useCallback, useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export const COUNTER_IDLE_MS = 1500;

const FADE_MS = 400;


export function useFadingCounter(): { opacity: Animated.Value; poke: () => void } {
  const opacity = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fadeAfterIdle = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start();
    }, COUNTER_IDLE_MS);
  }, [opacity]);

  const poke = useCallback(() => {
    opacity.stopAnimation();
    opacity.setValue(1);
    fadeAfterIdle();
  }, [fadeAfterIdle, opacity]);

  useEffect(() => {
    fadeAfterIdle();
    return () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
      }
    };
  }, [fadeAfterIdle]);

  return { opacity, poke };
}
