import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '../components/useReducedMotion';
import { travelerMotion } from '../theme/workspaceTokens';


interface RowEntranceProps {
  readonly delayMs?: number;
  readonly durationMs?: number;
  readonly risePx?: number;
  readonly replayKey?: number | string;
  readonly style?: StyleProp<ViewStyle>;
  readonly children: ReactNode;
}


export function RowEntrance({
  delayMs = 0,
  durationMs = travelerMotion.rowEntranceMs,
  risePx = travelerMotion.rowRisePx,
  replayKey,
  style,
  children,
}: RowEntranceProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: reducedMotion ? 0 : durationMs,
      delay: reducedMotion ? 0 : delayMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [delayMs, durationMs, progress, reducedMotion, replayKey]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [risePx, 0],
  });

  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
