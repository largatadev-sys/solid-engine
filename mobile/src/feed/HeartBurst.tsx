import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Icon } from '../components/Icon';
import { feedColors, feedMetrics } from '../theme/workspaceTokens';

const HOLD_MS = 250;

const FADE_MS = 280;


export function HeartBurst({ burstKey }: { readonly burstKey: number }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (burstKey === 0) {
      return;
    }
    scale.setValue(0);
    opacity.setValue(1);
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.delay(HOLD_MS),
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
    ]).start();
  }, [burstKey, opacity, scale]);

  if (burstKey === 0) {
    return null;
  }

  return (
    <View style={styles.stage} pointerEvents="none">
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Icon name="heartSolid" size={feedMetrics.burstSize} color={feedColors.burst} />
      </Animated.View>
    </View>
  );
}


const styles = StyleSheet.create({
  stage: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
