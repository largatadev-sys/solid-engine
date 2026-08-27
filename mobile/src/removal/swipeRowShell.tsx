import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { useReducedMotion } from '../components/useReducedMotion';
import { radii, spacing } from '../theme';
import { removalColors, removalMetrics, removalMotion, removalTypography } from '../theme/removalTokens';
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


export function useSwipeTrack(open: boolean, peek: boolean) {
  const x = useRef(new Animated.Value(0)).current;
  const at = useRef(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const listener = x.addListener(({ value }) => {
      at.current = value;
    });
    return () => x.removeListener(listener);
  }, [x]);

  const wasOpen = useRef(open);

  useEffect(() => {
    const closing = wasOpen.current && !open;
    wasOpen.current = open;
    if (!closing) {
      return;
    }
    Animated.timing(x, {
      toValue: 0,
      duration: reducedMotion ? 0 : removalMotion.snapMs,
      easing: Easing.bezier(0.2, 0.7, 0.2, 1),
      useNativeDriver: false,
    }).start();
  }, [open, reducedMotion, x]);

  const hinting = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stopHint = () => {
    for (const timer of hinting.current) clearTimeout(timer);
    hinting.current = [];
  };

  useEffect(() => {
    if (!peek || reducedMotion) {
      return;
    }
    const settle = (to: number) =>
      Animated.timing(x, {
        toValue: to,
        duration: removalMotion.snapMs,
        easing: Easing.bezier(0.2, 0.7, 0.2, 1),
        useNativeDriver: false,
      }).start();

    hinting.current = [
      setTimeout(() => settle(removalMotion.peekPx), removalMotion.peekOutAtMs),
      setTimeout(() => settle(0), removalMotion.peekBackAtMs),
    ];

    return stopHint;
  }, [peek, reducedMotion, x]);

  const grab = () => {
    stopHint();
    x.stopAnimation();
  };

  const snapTo = (landing: number) => {
    Animated.timing(x, {
      toValue: landing,
      duration: reducedMotion ? 0 : removalMotion.snapMs,
      easing: Easing.bezier(0.2, 0.7, 0.2, 1),
      useNativeDriver: false,
    }).start();
  };

  return { x, at, grab, snapTo };
}


export function SwipeStage({
  action,
  subjectTitle,
  onAct,
  children,
}: {
  readonly action: SwipeAction;
  readonly subjectTitle: string;
  readonly onAct: () => void;
  readonly children: ReactNode;
}) {
  const danger = action === 'delete';

  return (
    <View style={styles.stage}>
      <View style={[styles.panel, danger ? styles.panelDelete : styles.panelLeave]}>
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
      </View>

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
