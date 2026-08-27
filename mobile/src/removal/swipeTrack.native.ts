import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useReducedMotion } from '../components/useReducedMotion';
import { removalMotion } from '../theme/removalTokens';


export function useSwipeTrack(open: boolean, peek: boolean) {
  const x = useRef(new Animated.Value(0)).current;
  const at = useRef(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const listener = x.addListener(({ value }) => {
      at.current = value;
    });
    return () => x.removeListener(listener);
  }, [x]);

  const wasOpen = useRef(open);

  useEffect(() => {
    const closing = wasOpen.current && !open;
    wasOpen.current = open;
    if (!closing) {
      return;
    }
    Animated.timing(x, {
      toValue: 0,
      duration: reducedMotion ? 0 : removalMotion.snapMs,
      easing: Easing.bezier(0.2, 0.7, 0.2, 1),
      useNativeDriver: false,
    }).start();
  }, [open, reducedMotion, x]);

  const hinting = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stopHint = () => {
    for (const timer of hinting.current) clearTimeout(timer);
    hinting.current = [];
  };

  useEffect(() => {
    if (!peek || reducedMotion) {
      return;
    }
    const settle = (to: number) =>
      Animated.timing(x, {
        toValue: to,
        duration: removalMotion.snapMs,
        easing: Easing.bezier(0.2, 0.7, 0.2, 1),
        useNativeDriver: false,
      }).start();

    hinting.current = [
      setTimeout(() => settle(removalMotion.peekPx), removalMotion.peekOutAtMs),
      setTimeout(() => settle(0), removalMotion.peekBackAtMs),
    ];

    return stopHint;
  }, [peek, reducedMotion, x]);

  const grab = () => {
    stopHint();
    x.stopAnimation();
  };

  const snapTo = (landing: number) => {
    Animated.timing(x, {
      toValue: landing,
      duration: reducedMotion ? 0 : removalMotion.snapMs,
      easing: Easing.bezier(0.2, 0.7, 0.2, 1),
      useNativeDriver: false,
    }).start();
  };

  return { x, at, grab, snapTo };
}
