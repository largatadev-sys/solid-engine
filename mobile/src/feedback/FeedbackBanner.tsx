import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { Icon } from '../components/Icon';
import { useReducedMotion } from '../components/useReducedMotion';
import { colors, radii, spacing } from '../theme';
import { feedbackMetrics, feedbackMotion, feedbackTypography } from '../theme/workspaceTokens';


export function FeedbackBanner({ message }: { readonly message: string }) {
  const entrance = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: reducedMotion ? 0 : feedbackMotion.bannerInMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [entrance, reducedMotion]);

  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [feedbackMotion.bannerRisePx, 0],
  });

  return (
    <Animated.View
      style={[
        styles.banner,
        { opacity: entrance, transform: [{ translateY: reducedMotion ? 0 : translateY }] },
      ]}
      accessibilityRole="alert"
    >
      <Icon name="info" size={feedbackMetrics.bannerGlyph} color={colors.danger} />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.md,
    padding: spacing.sm3,
  },
  message: {
    flex: 1,
    ...feedbackTypography.banner,
    color: colors.textPrimary,
  },
});
