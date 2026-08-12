import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { radii, spacing } from '../theme';
import { feedColors, feedTypography } from '../theme/workspaceTokens';

const SHOW_MS = 180;

const HOLD_MS = 1600;


interface FeedToastProps {
  readonly message: string | null;
  readonly onDone: () => void;
}


export function FeedToast({ message, onDone }: FeedToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (message === null) {
      return;
    }
    const run = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: SHOW_MS, useNativeDriver: true }),
      Animated.delay(HOLD_MS),
      Animated.timing(opacity, { toValue: 0, duration: SHOW_MS, useNativeDriver: true }),
    ]);
    run.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => run.stop();
  }, [message, onDone, opacity]);

  if (message === null) {
    return null;
  }

  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Text style={styles.label}>{message}</Text>
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.xl,
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.sm3,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: feedColors.pillWell,
    alignItems: 'center',
  },
  label: {
    ...feedTypography.toast,
    color: feedColors.pillInk,
  },
});
