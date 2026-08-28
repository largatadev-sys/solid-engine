import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { baseUrl } from '../api/apiClient';
import { Icon } from '../components/Icon';
import { useReducedMotion } from '../components/useReducedMotion';
import { AnimatedPressable } from '../components/usePressFeedback';
import { colors, radii } from '../theme';
import { feedbackColors, feedbackMetrics, feedbackMotion } from '../theme/workspaceTokens';
import type { DockPosition } from './dockPosition';
import {
  clampY,
  defaultPosition,
  dismissZoneCentre,
  edgeX,
  inDismissZone,
  isDrag,
  landingFor,
  opensOnRelease,
  withOverdrag,
  yOf,
  type DockBounds,
  type Point,
} from './dockGeometry';
import { DISMISS_ZONE_LABEL, DOCK_LABEL } from './feedbackCopy';
import { setDockPosition, setDockVisibility, useFeedbackState } from './feedbackDockState';
import { dockVisible } from './feedbackVisibility';
import { FeedbackSheet } from './FeedbackSheet';
import type { ReportDraft } from './reportDraft';
import { useDockDrag } from './useDockDrag';
import { useDockPresence } from './useDockPresence';
import { useReportDraft } from './useReportDraft';


const DISMISS_RADIUS = 56;

type SpringShape = {
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: number;
};


function glide(
  value: Animated.Value,
  toValue: number,
  linear: boolean,
  duration: number,
  spring: SpringShape,
): Animated.CompositeAnimation {
  return linear
    ? Animated.timing(value, {
        toValue,
        duration,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    : Animated.spring(value, {
        toValue,
        useNativeDriver: false,
        ...spring,
      });
}


const NUDGES: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};


export function FeedbackDock() {
  const { visibility, position } = useFeedbackState();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const mintDraft = useReportDraft();

  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const visible = dockVisible(visibility, baseUrl());
  const presence = useDockPresence(visible && draft === null);

  const offset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lift = useRef(new Animated.Value(0)).current;
  const pressed = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const grabbedAt = useRef<Point>({ x: 0, y: 0 });
  const grabbedMs = useRef(0);
  const moved = useRef(false);
  const dragArmed = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerVerdict = useRef<boolean | null>(null);

  useEffect(() => () => disarmHold(), []);

  if (visible && !mounted) setMounted(true);

  const motionless = useRef(reducedMotion);
  motionless.current = reducedMotion;

  useEffect(() => {
    if (!mounted) return;
    entrance.stopAnimation();

    if (visible) {
      entrance.setValue(0);
      glide(entrance, 1, motionless.current, feedbackMotion.entranceMs, {
        stiffness: feedbackMotion.entranceStiffness,
        damping: feedbackMotion.entranceDamping,
        mass: feedbackMotion.snapMass,
      }).start();
      return;
    }

    Animated.timing(entrance, {
      toValue: 0,
      duration: feedbackMotion.exitMs,
      easing: motionless.current ? Easing.linear : Easing.in(Easing.quad),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, mounted, entrance]);

  const bounds: DockBounds | null =
    frame === null
      ? null
      : {
          width: frame.width,
          height: frame.height,
          insetTop: Math.max(insets.top, feedbackMotion.clampInsetPx),
          insetBottom: Math.max(insets.bottom, feedbackMotion.clampInsetPx),
          disc: feedbackMetrics.disc,
          rail: feedbackMotion.railInsetPx,
        };

  const parked: DockPosition | null =
    bounds === null
      ? null
      : (position ?? defaultPosition(bounds, feedbackMotion.defaultBottomReservePx));

  const restingAt = (): Point =>
    bounds === null || parked === null
      ? { x: 0, y: 0 }
      : { x: edgeX(parked.edge, bounds), y: yOf(parked.y, bounds) };

  const settle = () => {
    if (reducedMotion) {
      Animated.timing(offset, {
        toValue: { x: 0, y: 0 },
        duration: feedbackMotion.snapMs,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
      return;
    }

    Animated.spring(offset, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      stiffness: feedbackMotion.snapStiffness,
      damping: feedbackMotion.snapDamping,
      mass: feedbackMotion.snapMass,
    }).start();
  };

  const open = () => {
    setDraft((held) => held ?? mintDraft());
  };

  const activate = () => {
    const verdict = pointerVerdict.current;
    pointerVerdict.current = null;
    if (verdict !== null) return;
    open();
  };

  const pressIn = () => {
    presence.wake();
    Animated.timing(pressed, {
      toValue: 1,
      duration: reducedMotion ? 0 : feedbackMotion.pressInMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const pressOut = () => {
    glide(pressed, 0, reducedMotion, feedbackMotion.pressInMs, {
      stiffness: feedbackMotion.pressOutStiffness,
      damping: feedbackMotion.pressOutDamping,
      mass: feedbackMotion.snapMass,
    }).start();
  };

  const beginDrag = () => {
    disarmHold();
    if (dragArmed.current) return;
    dragArmed.current = true;
    setDragging(true);
    liftTo(1);
  };

  const armHold = () => {
    disarmHold();
    holdTimer.current = setTimeout(beginDrag, feedbackMotion.holdToDragMs);
  };

  const disarmHold = () => {
    if (holdTimer.current === null) return;
    clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  const liftTo = (value: number) => {
    glide(lift, value, reducedMotion, feedbackMotion.liftMs, {
      stiffness: feedbackMotion.liftStiffness,
      damping: feedbackMotion.liftDamping,
      mass: feedbackMotion.liftMass,
    }).start();
  };

  const drag = useDockDrag({
    threshold: feedbackMotion.dragThresholdPx,
    dragging,
    onNudge: (key) => nudgeBy(key),
    onActivate: () => open(),
    onGrab: () => {
      moved.current = false;
      pointerVerdict.current = null;
      grabbedAt.current = restingAt();
      grabbedMs.current = Date.now();
      presence.wake();
      armHold();
    },
    onMove: (delta) => {
      if (bounds === null) return;
      if (!moved.current && isDrag({ x: 0, y: 0 }, delta, feedbackMotion.dragThresholdPx)) {
        moved.current = true;
        beginDrag();
      }
      if (!moved.current) return;

      const at = {
        x: withOverdrag(grabbedAt.current.x + delta.x, bounds, feedbackMotion.overdragPx),
        y: clampY(grabbedAt.current.y + delta.y, bounds),
      };
      offset.setValue({ x: at.x - grabbedAt.current.x, y: at.y - grabbedAt.current.y });
    },
    onRelease: (delta) => {
      disarmHold();
      dragArmed.current = false;
      setDragging(false);
      liftTo(0);
      if (bounds === null) return;

      const release = { x: grabbedAt.current.x + delta.x, y: grabbedAt.current.y + delta.y };
      const tapped = opensOnRelease(
        delta,
        Date.now() - grabbedMs.current,
        feedbackMotion.dragThresholdPx,
        feedbackMotion.tapHoldLimitMs,
      );
      pointerVerdict.current = tapped;

      if (tapped) {
        offset.setValue({ x: 0, y: 0 });
        open();
        return;
      }

      const zone = {
        centre: dismissZoneCentre(bounds, dismissBottom(insets.bottom)),
        radius: DISMISS_RADIUS,
      };
      if (inDismissZone(release, bounds, zone)) {
        offset.setValue({ x: 0, y: 0 });
        setDockVisibility('hidden');
        return;
      }

      const landing = landingFor(release, bounds);
      const to = { x: edgeX(landing.edge, bounds), y: yOf(landing.y, bounds) };
      offset.setValue({ x: release.x - to.x, y: release.y - to.y });
      setDockPosition(landing);
      settle();
    },
  });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setFrame({ width, height });
  };

  const nudgeBy = (key: string): boolean => {
    if (bounds === null || parked === null) return false;

    const nudge = NUDGES[key];
    if (nudge === undefined) return false;
    presence.wake();

    const from = restingAt();
    setDockPosition(
      landingFor(
        {
          x: from.x + nudge.x * feedbackMotion.nudgePx,
          y: from.y + nudge.y * feedbackMotion.nudgePx,
        },
        bounds,
      ),
    );
    return true;
  };

  if (!mounted) {
    return null;
  }

  const resting = restingAt();
  const liftScale = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, reducedMotion ? 1 : feedbackMotion.liftScale],
  });
  const pressScale = pressed.interpolate({
    inputRange: [0, 1],
    outputRange: [1, reducedMotion ? 1 : feedbackMotion.pressScale],
  });
  const entranceScale = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [reducedMotion ? 1 : feedbackMotion.entranceFromScale, 1],
  });
  const scale = Animated.multiply(Animated.multiply(liftScale, pressScale), entranceScale);

  return (
    <>
      <View style={styles.layer} onLayout={onLayout} pointerEvents="box-none">
        {bounds !== null && (
          <>
            {dragging && <Rails bounds={bounds} />}
            {dragging && <DismissZone bottom={dismissBottom(insets.bottom)} />}

            <AnimatedPressable
              style={[
                styles.disc,
                dragging && styles.lifted,
                drag.discStyle,
                {
                  left: resting.x,
                  top: resting.y,
                  transform: [
                    { translateX: offset.x },
                    { translateY: offset.y },
                    { scale },
                  ],
                  opacity:
                    draft === null ? Animated.multiply(presence.opacity, entrance) : 0,
                },
              ]}
              pointerEvents={draft === null ? 'auto' : 'none'}
              onPressIn={pressIn}
              onPressOut={pressOut}
              onPress={activate}
              onHoverIn={presence.wake}
              onFocus={presence.wake}
              hitSlop={2}
              accessibilityRole="button"
              accessibilityLabel={DOCK_LABEL}
              accessibilityElementsHidden={draft !== null}
              importantForAccessibility={draft === null ? 'yes' : 'no-hide-descendants'}
              {...drag.handlers}
            >
              <Icon name="feedback" size={feedbackMetrics.glyph} color={colors.accent} />
            </AnimatedPressable>
          </>
        )}
      </View>

      <FeedbackSheet draft={draft} onClose={() => setDraft(null)} />
    </>
  );
}


function Rails({ bounds }: { readonly bounds: DockBounds }) {
  const entrance = useFade();

  return (
    <>
      <Animated.View
        style={[styles.rail, { left: 0, width: bounds.rail * 2, opacity: entrance }]}
        pointerEvents="none"
      />
      <Animated.View
        style={[styles.rail, { right: 0, width: bounds.rail * 2, opacity: entrance }]}
        pointerEvents="none"
      />
    </>
  );
}


function DismissZone({ bottom }: { readonly bottom: number }) {
  const entrance = useFade();

  return (
    <Animated.View
      style={[styles.dismiss, { bottom, opacity: entrance }]}
      pointerEvents="none"
      accessibilityLabel={DISMISS_ZONE_LABEL}
    >
      <Icon name="close" size={feedbackMetrics.dismissGlyph} color={colors.textOnAccent} />
    </Animated.View>
  );
}


function useFade(): Animated.Value {
  const fade = useRef(new Animated.Value(0)).current;
  const started = useRef(false);

  if (!started.current) {
    started.current = true;
    Animated.timing(fade, {
      toValue: 1,
      duration: feedbackMotion.railsInMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }

  return fade;
}


function dismissBottom(safeBottom: number): number {
  return Math.max(safeBottom, feedbackMotion.clampInsetPx) + feedbackMotion.defaultBottomReservePx;
}


const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
  disc: {
    position: 'absolute',
    width: feedbackMetrics.disc,
    height: feedbackMetrics.disc,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  lifted: {
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
  rail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: feedbackColors.dragRail,
  },
  dismiss: {
    position: 'absolute',
    alignSelf: 'center',
    width: feedbackMetrics.dismissZone,
    height: feedbackMetrics.dismissZone,
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
