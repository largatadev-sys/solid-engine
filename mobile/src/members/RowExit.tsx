import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '../components/useReducedMotion';
import { publicProfileMotion } from '../theme/workspaceTokens';


interface RowExitProps {
  readonly leaving: boolean;
  readonly onGone: () => void;
  readonly durationMs?: number;
  readonly dropPx?: number;
  readonly style?: StyleProp<ViewStyle>;
  readonly children: ReactNode;
}


export function RowExit({
  leaving,
  onGone,
  durationMs = publicProfileMotion.rowExitMs,
  dropPx = publicProfileMotion.rowExitDropPx,
  style,
  children,
}: RowExitProps) {
  const progress = useRef(new Animated.Value(1)).current;
  const reducedMotion = useReducedMotion();
  const gone = useRef(onGone);
  gone.current = onGone;

  useEffect(() => {
    if (!leaving) {
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: reducedMotion ? publicProfileMotion.reducedSwapMs : durationMs,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) gone.current();
    });
  }, [durationMs, leaving, progress, reducedMotion]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [reducedMotion ? 0 : dropPx, 0],
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
