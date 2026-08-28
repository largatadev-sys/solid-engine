import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { feedbackMotion } from '../theme/workspaceTokens';
import { finePointer } from './finePointer';

let launchWakeSpent = false;


export function resetLaunchWakeForTests(): void {
  launchWakeSpent = false;
}


export function useDockPresence(visible: boolean): {
  readonly opacity: Animated.Value;
  readonly wake: () => void;
} {
  const opacity = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fine = finePointer();

  const clear = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const fadeAfter = (delay: number) => {
    clear();
    if (fine) return;
    timer.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: feedbackMotion.idleOpacity,
        duration: feedbackMotion.idleFadeMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }, delay);
  };

  const wake = () => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: feedbackMotion.wakeMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    fadeAfter(feedbackMotion.idleAfterMs);
  };

  useEffect(() => {
    if (!visible) {
      clear();
      return;
    }

    const holding = !launchWakeSpent;
    launchWakeSpent = true;
    opacity.setValue(1);
    fadeAfter(holding ? feedbackMotion.launchWakeMs : feedbackMotion.idleAfterMs);

    return clear;
  }, [visible]);

  return { opacity, wake };
}
