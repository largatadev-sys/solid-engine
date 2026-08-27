import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from '../components/useReducedMotion';
import { spacing } from '../theme';
import { removalColors, removalMetrics, removalMotion, removalTypography } from '../theme/removalTokens';
import { DRAIN_LEAD_MS, PLAIN_HOLD_MS, type UndoToast as UndoToastModel } from './undoQueue';


export type ToastHost = 'profile' | 'trips';


interface UndoToastProps {
  readonly toast: UndoToastModel | null;
  readonly host: ToastHost;
  readonly lifted?: boolean;
  readonly onUndo: (token: number) => void;
  readonly onDone: (token: number) => void;
}


export function UndoToast({ toast, host, lifted = false, onUndo, onDone }: UndoToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const drain = useRef(new Animated.Value(1)).current;
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;

  const token = toast?.token ?? null;
  const undoable = toast?.undoable ?? false;
  const holdMs = toast?.holdMs ?? PLAIN_HOLD_MS;

  useEffect(() => {
    if (token === null) {
      return;
    }
    const settled = token;
    const run = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: removalMotion.toastInMs,
        useNativeDriver: true,
      }),
      Animated.delay(holdMs),
      Animated.timing(opacity, {
        toValue: 0,
        duration: removalMotion.toastOutMs,
        useNativeDriver: true,
      }),
    ]);
    run.start(({ finished }) => {
      if (finished) done.current(settled);
    });
    return () => run.stop();
  }, [holdMs, opacity, token]);

  useEffect(() => {
    if (token === null || !undoable) {
      return;
    }
    drain.setValue(1);
    let live = true;
    let started: Animated.CompositeAnimation | null = null;

    const begin = () => {
      if (!live) return;
      started = Animated.timing(drain, {
        toValue: 0,
        duration: holdMs - DRAIN_LEAD_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      started.start();
    };

    const paint = requestAnimationFrame(() => requestAnimationFrame(begin));
    const floor = setTimeout(begin, removalMotion.drainFloorMs);

    return () => {
      live = false;
      cancelAnimationFrame(paint);
      clearTimeout(floor);
      started?.stop();
    };
  }, [drain, holdMs, token, undoable]);

  if (toast === null || token === null) {
    return null;
  }

  const profile = host === 'profile';
  const bottom = lifted
    ? removalMetrics.tripsToastBottomLifted
    : profile
      ? removalMetrics.profileToastBottom
      : removalMetrics.tripsToastBottom;

  return (
    <Animated.View
      style={[
        styles.toast,
        profile ? styles.profileToast : styles.tripsToast,
        undoable ? styles.withAction : styles.plain,
        {
          bottom,
          marginHorizontal: profile
            ? removalMetrics.profileToastInset
            : removalMetrics.tripsToastInset,
          opacity,
        },
      ]}
      pointerEvents={undoable ? 'box-none' : 'none'}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <View style={styles.row}>
        <Text style={styles.label} numberOfLines={1}>
          {toast.message}
        </Text>

        {undoable && (
          <>
            <View
              style={[
                styles.divider,
                profile ? styles.dividerTall : styles.dividerShort,
              ]}
            />
            <Pressable
              style={styles.undo}
              onPress={() => onUndo(token)}
              accessibilityRole="button"
              accessibilityLabel={toast.undoLabel}
            >
              <Text style={profile ? styles.undoLabelProfile : styles.undoLabelTrips}>
                {toast.undoLabel}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {undoable && !reducedMotion && width > 0 && (
        <Animated.View
          style={[
            styles.drain,
            profile ? styles.drainProfile : styles.drainTrips,
            { width, transform: [{ translateX: -width / 2 }, { scaleX: drain }, { translateX: width / 2 }] },
          ]}
          pointerEvents="none"
        />
      )}
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  profileToast: {
    borderRadius: removalMetrics.toastRadiusProfile,
    backgroundColor: removalColors.profileToastWell,
  },
  tripsToast: {
    borderRadius: removalMetrics.toastRadiusTrips,
    backgroundColor: removalColors.tripsToastWell,
  },
  plain: {
    paddingVertical: removalMetrics.toastPaddingV,
    paddingHorizontal: removalMetrics.toastPaddingH,
    alignItems: 'center',
  },
  withAction: {
    paddingVertical: removalMetrics.toastActionPaddingV,
    paddingLeft: removalMetrics.toastActionPaddingLeft,
    paddingRight: removalMetrics.toastActionPaddingRight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    ...removalTypography.toast,
    color: removalColors.toastInk,
    flexShrink: 1,
  },
  divider: {
    width: removalMetrics.toastDividerWidth,
    backgroundColor: removalColors.toastDivider,
    marginLeft: spacing.sm3,
    flexGrow: 0,
    flexShrink: 0,
  },
  dividerTall: {
    height: removalMetrics.toastDividerHeight,
  },
  dividerShort: {
    height: removalMetrics.toastDividerHeightTrips,
  },
  undo: {
    minHeight: removalMetrics.undoTarget,
    minWidth: removalMetrics.undoTarget,
    paddingHorizontal: removalMetrics.undoPaddingH,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  undoLabelProfile: {
    ...removalTypography.profileUndo,
    color: removalColors.profileToastAccent,
  },
  undoLabelTrips: {
    ...removalTypography.tripsUndo,
    color: removalColors.tripsToastAccent,
  },
  drain: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: removalMetrics.drainHeight,
  },
  drainProfile: {
    backgroundColor: removalColors.profileToastAccent,
  },
  drainTrips: {
    backgroundColor: removalColors.tripsToastAccent,
  },
});
