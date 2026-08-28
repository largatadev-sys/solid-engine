import { useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { baseUrl } from '../api/apiClient';
import { Icon } from '../components/Icon';
import { useReducedMotion } from '../components/useReducedMotion';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
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


const DISMISS_RADIUS = 44;

const NUDGES: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};


export function FeedbackDock() {
  const { visibility, position } = useFeedbackState();
  const insets = useSafeAreaInsets();
  const press = usePressFeedback();
  const reducedMotion = useReducedMotion();
  const mintDraft = useReportDraft();

  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const visible = dockVisible(visibility, baseUrl());
  const presence = useDockPresence(visible && draft === null);

  const offset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lift = useRef(new Animated.Value(0)).current;
  const grabbedAt = useRef<Point>({ x: 0, y: 0 });
  const moved = useRef(false);

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
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.spring(offset, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      stiffness: feedbackMotion.snapStiffness,
      damping: feedbackMotion.snapDamping,
      mass: feedbackMotion.snapMass,
    }).start();
  };

  const open = () => {
    setDraft((held) => held ?? mintDraft());
  };

  const liftTo = (value: number) => {
    Animated.timing(lift, {
      toValue: value,
      duration: reducedMotion ? 0 : feedbackMotion.liftMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const drag = useDockDrag({
    threshold: feedbackMotion.dragThresholdPx,
    dragging,
    onNudge: (key) => nudgeBy(key),
    onGrab: () => {
      moved.current = false;
      grabbedAt.current = restingAt();
      setDragging(true);
      presence.wake();
      liftTo(1);
    },
    onMove: (delta) => {
      if (bounds === null) return;
      if (!moved.current && isDrag({ x: 0, y: 0 }, delta, feedbackMotion.dragThresholdPx)) {
        moved.current = true;
      }
      const at = {
        x: withOverdrag(grabbedAt.current.x + delta.x, bounds, feedbackMotion.overdragPx),
        y: clampY(grabbedAt.current.y + delta.y, bounds),
      };
      offset.setValue({ x: at.x - grabbedAt.current.x, y: at.y - grabbedAt.current.y });
    },
    onRelease: (delta) => {
      setDragging(false);
      liftTo(0);
      if (bounds === null) return;

      const release = { x: grabbedAt.current.x + delta.x, y: grabbedAt.current.y + delta.y };
      const tapped = !isDrag({ x: 0, y: 0 }, delta, feedbackMotion.dragThresholdPx);

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

  if (!visible) {
    return null;
  }

  const resting = restingAt();
  const scale = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, reducedMotion ? 1 : feedbackMotion.liftScale],
  });

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
                    ...press.style.transform,
                  ],
                  opacity:
                    draft === null
                      ? Animated.multiply(presence.opacity, press.style.opacity)
                      : 0,
                },
              ]}
              pointerEvents={draft === null ? 'auto' : 'none'}
              onPressIn={press.onPressIn}
              onPressOut={press.onPressOut}
              onPress={open}
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
  const entrance = useRef(new Animated.Value(0)).current;
  const started = useRef(false);

  if (!started.current) {
    started.current = true;
    Animated.timing(entrance, {
      toValue: 1,
      duration: feedbackMotion.railsInMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }

  return entrance;
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
