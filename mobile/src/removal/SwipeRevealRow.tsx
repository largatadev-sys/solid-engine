import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { useReducedMotion } from '../components/useReducedMotion';
import { radii, spacing } from '../theme';
import { removalColors, removalMetrics, removalMotion, removalTypography } from '../theme/removalTokens';

import { DELETE_TRIP_LABEL, LEAVE_TRIP_LABEL, swipeActionLabel } from './removalCopy';
import { OPEN_X, engages, restingX, trackedX } from './swipeReveal';


export type SwipeAction = 'delete' | 'leave';


interface SwipeRevealRowProps {
  readonly action: SwipeAction;
  readonly subjectTitle: string;
  readonly open: boolean;
  readonly peek: boolean;
  readonly onOpen: () => void;
  readonly onClose: () => void;
  readonly onAct: () => void;
  readonly children: ReactNode;
}


export function SwipeRevealRow({
  action,
  subjectTitle,
  open,
  peek,
  onOpen,
  onClose,
  onAct,
  children,
}: SwipeRevealRowProps) {
  const x = useRef(new Animated.Value(0)).current;
  const at = useRef(0);
  const base = useRef(0);
  const reducedMotion = useReducedMotion();
  const openRef = useRef(open);
  openRef.current = open;
  const settle = useRef(onOpen);
  settle.current = onOpen;
  const shut = useRef(onClose);
  shut.current = onClose;

  useEffect(() => {
    const listener = x.addListener(({ value }) => {
      at.current = value;
    });
    return () => x.removeListener(listener);
  }, [x]);

  useEffect(() => {
    if (open) {
      return;
    }
    Animated.timing(x, {
      toValue: 0,
      duration: reducedMotion ? 0 : removalMotion.snapMs,
      easing: Easing.bezier(0.2, 0.7, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [open, reducedMotion, x]);

  useEffect(() => {
    if (!peek || reducedMotion) {
      return;
    }
    const out = setTimeout(() => {
      Animated.timing(x, {
        toValue: removalMotion.peekPx,
        duration: removalMotion.snapMs,
        easing: Easing.bezier(0.2, 0.7, 0.2, 1),
        useNativeDriver: true,
      }).start();
    }, removalMotion.peekOutAtMs);

    const back = setTimeout(() => {
      Animated.timing(x, {
        toValue: 0,
        duration: removalMotion.snapMs,
        easing: Easing.bezier(0.2, 0.7, 0.2, 1),
        useNativeDriver: true,
      }).start();
    }, removalMotion.peekBackAtMs);

    return () => {
      clearTimeout(out);
      clearTimeout(back);
    };
  }, [peek, reducedMotion, x]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => engages(gesture.dx, gesture.dy),
      onPanResponderGrant: () => {
        base.current = at.current;
        x.stopAnimation();
      },
      onPanResponderMove: (_event, gesture) => {
        x.setValue(trackedX(base.current, gesture.dx));
      },
      onPanResponderRelease: (_event, gesture) => {
        const landing = restingX(trackedX(base.current, gesture.dx));
        Animated.timing(x, {
          toValue: landing,
          duration: removalMotion.snapMs,
          easing: Easing.bezier(0.2, 0.7, 0.2, 1),
          useNativeDriver: true,
        }).start();
        if (landing === OPEN_X) settle.current();
        else if (openRef.current) shut.current();
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

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
            name={danger ? 'trash' : 'back'}
            size={removalMetrics.panelGlyph}
            color={removalColors.onPanel}
          />
          <Text style={styles.panelLabel}>{danger ? DELETE_TRIP_LABEL : LEAVE_TRIP_LABEL}</Text>
        </Pressable>
      </View>

      <Animated.View style={{ transform: [{ translateX: x }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
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
