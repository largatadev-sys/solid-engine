import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '../components/useReducedMotion';
import { publicProfileMotion, travelerMotion } from '../theme/workspaceTokens';


interface RowEntranceProps {
  readonly delayMs?: number;
  readonly durationMs?: number;
  readonly risePx?: number;
  readonly replayKey?: number | string;
  readonly leaving?: boolean;
  readonly onGone?: () => void;
  readonly style?: StyleProp<ViewStyle>;
  readonly children: ReactNode;
}


export function RowEntrance({
  delayMs = 0,
  durationMs = travelerMotion.rowEntranceMs,
  risePx = travelerMotion.rowRisePx,
  replayKey,
  leaving = false,
  onGone,
  style,
  children,
}: RowEntranceProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  const gone = useRef(onGone);
  gone.current = onGone;

  useEffect(() => {
    if (leaving) {
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: reducedMotion ? 0 : durationMs,
      delay: reducedMotion ? 0 : delayMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [delayMs, durationMs, leaving, progress, reducedMotion, replayKey]);

  useEffect(() => {
    if (!leaving) {
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: reducedMotion ? publicProfileMotion.reducedSwapMs : publicProfileMotion.rowExitMs,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) gone.current?.();
    });
  }, [leaving, progress, reducedMotion]);

  const travel = leaving ? publicProfileMotion.rowExitDropPx : risePx;
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [reducedMotion ? 0 : travel, 0],
  });

  return (
    <Animated.View
      style={[style, { opacity: progress, transform: [{ translateY }] }]}
      pointerEvents={leaving ? 'none' : 'auto'}
    >
      {children}
    </Animated.View>
  );
}
