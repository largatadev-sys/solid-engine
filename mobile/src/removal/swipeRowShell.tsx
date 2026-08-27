import type { ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { radii, spacing } from '../theme';
import { removalColors, removalMetrics, removalTypography } from '../theme/removalTokens';
import { DELETE_TRIP_LABEL, LEAVE_TRIP_LABEL, swipeActionLabel } from './removalCopy';


export type SwipeAction = 'delete' | 'leave';


export interface SwipeRowProps {
  readonly action: SwipeAction;
  readonly subjectTitle: string;
  readonly open: boolean;
  readonly peek: boolean;
  readonly onOpen: () => void;
  readonly onClose: () => void;
  readonly onAct: () => void;
  readonly children: ReactNode;
}


export function SwipeStage({
  action,
  subjectTitle,
  revealed,
  onAct,
  children,
}: {
  readonly action: SwipeAction;
  readonly subjectTitle: string;
  readonly revealed: boolean | Animated.AnimatedInterpolation<number>;
  readonly onAct: () => void;
  readonly children: ReactNode;
}) {
  const danger = action === 'delete';
  const shown = typeof revealed === 'boolean' ? (revealed ? 1 : 0) : revealed;

  return (
    <View style={styles.stage}>
      <Animated.View
        style={[styles.panel, danger ? styles.panelDelete : styles.panelLeave, { opacity: shown }]}
        pointerEvents={revealed === false ? 'none' : 'auto'}
      >
        <Pressable
          style={styles.panelTarget}
          onPress={onAct}
          accessibilityRole="button"
          accessibilityLabel={swipeActionLabel(action, subjectTitle)}
        >
          <Icon
            name={danger ? 'trash' : 'logOut'}
            size={removalMetrics.panelGlyph}
            color={removalColors.onPanel}
          />
          <Text style={styles.panelLabel}>{danger ? DELETE_TRIP_LABEL : LEAVE_TRIP_LABEL}</Text>
        </Pressable>
      </Animated.View>

      {children}
    </View>
  );
}


const styles = StyleSheet.create({
  stage: {
    position: 'relative',
  },
  panel: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.lg,
    alignItems: 'flex-end',
  },
  panelDelete: {
    backgroundColor: removalColors.panelDelete,
  },
  panelLeave: {
    backgroundColor: removalColors.panelLeave,
  },
  panelTarget: {
    width: removalMetrics.panelWidth,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: removalMetrics.panelGap,
    paddingHorizontal: spacing.sm,
  },
  panelLabel: {
    ...removalTypography.panelLabel,
    color: removalColors.onPanel,
  },
});


export function revealedFrom(x: Animated.Value): Animated.AnimatedInterpolation<number> {
  return x.interpolate({ inputRange: [-1, 0, 1], outputRange: [1, 0, 1], extrapolate: 'clamp' });
}
