import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { useReducedMotion } from '../components/useReducedMotion';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { spacing } from '../theme';
import {
  followColors,
  followMetrics,
  profileColors,
  profileMetrics,
  profileTypography,
  publicProfileMotion,
  workspaceColors,
  workspaceRadii,
} from '../theme/workspaceTokens';
import type { ViewerRelation } from '../types/api';
import { followPillLabel, followPillTreatment } from './followPillTreatment';


export type FollowPillSize = 'full' | 'compact';


interface FollowPillProps {
  readonly relation: ViewerRelation;
  readonly displayName: string;
  readonly onPress: () => void;
  readonly size?: FollowPillSize;
}


export function FollowPill({ relation, displayName, onPress, size = 'full' }: FollowPillProps) {
  const press = usePressFeedback();
  const reducedMotion = useReducedMotion();
  const treatment = followPillTreatment(relation);
  const fill = useRef(new Animated.Value(treatment.filled ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: treatment.filled ? 1 : 0,
      duration: reducedMotion
        ? publicProfileMotion.reducedSwapMs
        : publicProfileMotion.pillCrossfadeMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [fill, treatment.filled, reducedMotion]);

  const compact = size === 'compact';

  return (
    <AnimatedPressable
      style={StyleSheet.flatten([
        styles.pill,
        compact && styles.compact,
        {
          backgroundColor: fill.interpolate({
            inputRange: [0, 1],
            outputRange: [followColors.followingWell, workspaceColors.accent],
          }),
          borderColor: fill.interpolate({
            inputRange: [0, 1],
            outputRange: [followColors.followingBorder, workspaceColors.accent],
          }),
        },
        reducedMotion ? null : press.style,
      ])}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={followPillLabel(relation, displayName)}
    >
      {treatment.glyph && (
        <Icon
          name="check"
          size={compact ? followMetrics.compactCheckGlyph : followMetrics.checkGlyph}
          color={followColors.followingInk}
        />
      )}
      <Text
        style={[
          styles.label,
          compact && styles.compactLabel,
          treatment.filled && styles.filledLabel,
          treatment.muted && styles.mutedLabel,
        ]}
      >
        {treatment.label}
      </Text>
    </AnimatedPressable>
  );
}


export function FollowPillSlot({ children }: { readonly children: React.ReactNode }) {
  return <View style={styles.slot}>{children}</View>;
}


const styles = StyleSheet.create({
  pill: {
    height: profileMetrics.editPillHeight,
    borderWidth: 1,
    borderRadius: workspaceRadii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs2,
  },
  compact: {
    height: followMetrics.compactPillHeight,
    paddingHorizontal: spacing.sm2,
  },
  label: {
    ...profileTypography.editPill,
    color: followColors.followingInk,
  },
  compactLabel: {
    ...profileTypography.compactPill,
  },
  filledLabel: {
    color: profileColors.onAccent,
  },
  mutedLabel: {
    color: followColors.chipInk,
  },
  slot: {
    alignSelf: 'stretch',
  },
});
