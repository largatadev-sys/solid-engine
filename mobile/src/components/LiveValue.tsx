import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from './useReducedMotion';
import { changedSince, type LiveValue as LiveValueOf } from './liveValueChange';
import { colors, radii } from '../theme';
import { liveUpdateMotion } from '../theme/workspaceTokens';


interface LiveValueProps {
  readonly value: LiveValueOf;
  readonly style?: StyleProp<ViewStyle>;
  readonly children: ReactNode;
}


export function LiveValue({ value, style, children }: LiveValueProps) {
  const bloom = useRef(new Animated.Value(0)).current;
  const seen = useRef<LiveValueOf | undefined>(undefined);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const announces = changedSince(seen.current, value);
    seen.current = value;
    if (!announces || reducedMotion) return;

    bloom.setValue(0);
    const pulse = Animated.sequence([
      Animated.timing(bloom, {
        toValue: 1,
        duration: liveUpdateMotion.valueBloomMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.delay(liveUpdateMotion.valueHoldMs),
      Animated.timing(bloom, {
        toValue: 0,
        duration: liveUpdateMotion.valueFadeMs,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false,
      }),
    ]);
    pulse.start();

    return () => pulse.stop();
  }, [bloom, reducedMotion, value]);

  const backgroundColor = bloom.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.accentTintClear, colors.liveChangeWash],
  });

  return (
    <Animated.View style={[styles.wrap, style, { backgroundColor }]}>{children}</Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    marginHorizontal: -4,
    paddingHorizontal: 4,
  },
});
