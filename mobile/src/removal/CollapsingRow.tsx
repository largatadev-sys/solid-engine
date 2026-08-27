import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useReducedMotion } from '../components/useReducedMotion';
import { removalMotion } from '../theme/removalTokens';


interface CollapsingRowProps {
  readonly collapsed: boolean;
  readonly gap: number;
  readonly children: ReactNode;
}


export function CollapsingRow({ collapsed, gap, children }: CollapsingRowProps) {
  const openness = useRef(new Animated.Value(1)).current;
  const reducedMotion = useReducedMotion();
  const [height, setHeight] = useState<number | null>(null);
  const [settled, setSettled] = useState(collapsed);

  const measure = (event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.height;
    if (measured > 0 && !collapsed) setHeight(measured);
  };

  useEffect(() => {
    const run = Animated.timing(openness, {
      toValue: collapsed ? 0 : 1,
      duration: reducedMotion
        ? 0
        : collapsed
          ? removalMotion.collapseMs
          : removalMotion.restoreMs,
      easing: collapsed ? Easing.bezier(0.4, 0, 1, 1) : Easing.bezier(0.2, 0.7, 0.2, 1),
      useNativeDriver: false,
    });
    run.start(({ finished }) => {
      if (finished) setSettled(collapsed);
    });
    if (!collapsed) setSettled(false);
    return () => run.stop();
  }, [collapsed, openness, reducedMotion]);

  if (collapsed && settled) {
    return null;
  }

  if (height === null) {
    return <View onLayout={measure}>{children}</View>;
  }

  return (
    <Animated.View
      style={[
        styles.row,
        {
          height: openness.interpolate({ inputRange: [0, 1], outputRange: [0, height] }),
          opacity: openness,
          marginBottom: openness.interpolate({ inputRange: [0, 1], outputRange: [-gap, 0] }),
        },
      ]}
      pointerEvents={collapsed ? 'none' : 'auto'}
    >
      <View onLayout={measure}>{children}</View>
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  row: {
    overflow: 'hidden',
  },
});
