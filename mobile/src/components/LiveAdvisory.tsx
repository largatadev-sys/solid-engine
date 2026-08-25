import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from './useReducedMotion';
import { liveUpdateMotion } from '../theme/workspaceTokens';


interface LiveAdvisoryProps {
  readonly showing: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly children: ReactNode;
}


export function LiveAdvisory({ showing, style, children }: LiveAdvisoryProps) {
  const progress = useRef(new Animated.Value(showing ? 1 : 0)).current;
  const [mounted, setMounted] = useState(showing);
  const held = useRef<ReactNode>(children);
  const reducedMotion = useReducedMotion();

  if (showing) held.current = children;

  useEffect(() => {
    if (showing) setMounted(true);

    const settling = Animated.timing(progress, {
      toValue: showing ? 1 : 0,
      duration: reducedMotion ? 0 : showing ? liveUpdateMotion.advisoryInMs : liveUpdateMotion.advisoryOutMs,
      easing: showing ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
      useNativeDriver: true,
    });
    settling.start(({ finished }) => {
      if (finished && !showing) setMounted(false);
    });

    return () => settling.stop();
  }, [progress, reducedMotion, showing]);

  if (!mounted) return null;

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [liveUpdateMotion.advisoryRisePx, 0],
  });

  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>
      {held.current}
    </Animated.View>
  );
}
