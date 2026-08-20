import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { MOBILE_FRAME_WIDTH } from '../components/mobileFrameContract';
import { stillShowing } from '../components/stillShowing';
import { useReducedMotion } from '../components/useReducedMotion';
import {
  sheetMotion,
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
  workspaceTypography,
} from '../theme/workspaceTokens';
import type { ForwardConfirmWording } from './workspaceControls';


export interface TransitionConfirmation {
  readonly wording: ForwardConfirmWording;
  readonly busy: boolean;
}


interface TransitionDrawerProps {
  readonly confirmation: TransitionConfirmation | null;
  readonly onConfirm: () => void;
  readonly onDismiss: () => void;
}


export function TransitionDrawer({ confirmation, onConfirm, onDismiss }: TransitionDrawerProps) {
  const last = useRef<TransitionConfirmation | null>(null);
  const travel = useRef(new Animated.Value(0)).current;
  const scrim = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  const open = confirmation !== null;
  const dismiss = useRef(onDismiss);
  dismiss.current = confirmation?.busy === true ? () => undefined : onDismiss;

  if (confirmation !== null) {
    last.current = confirmation;
  }
  const shown = stillShowing(confirmation, last.current);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scrim, {
        toValue: open ? 1 : 0,
        duration: open ? sheetMotion.scrimInMs : sheetMotion.scrimOutMs,
        easing: open ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(travel, {
        toValue: open ? 1 : 0,
        duration: reducedMotion ? 0 : open ? sheetMotion.travelInMs : sheetMotion.travelOutMs,
        easing: open ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [open, reducedMotion, scrim, travel]);

  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > SWIPE_CLAIM_PX,
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > SWIPE_DISMISS_PX) dismiss.current();
      },
    }),
  ).current;

  if (shown === null) {
    return null;
  }

  const { wording, busy } = shown;
  const translateY = travel.interpolate({
    inputRange: [0, 1],
    outputRange: [DRAWER_TRAVEL, 0],
  });

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.stage}>
        <Animated.View style={[styles.scrim, { opacity: scrim }]}>
          <Pressable
            style={styles.scrimTarget}
            onPress={busy ? undefined : onDismiss}
            accessibilityRole="button"
            accessibilityLabel={wording.cancelLabel}
          />
        </Animated.View>

        <Animated.View style={[styles.drawer, { transform: [{ translateY }] }]} {...swipe.panHandlers}>
          <View style={styles.handle} />

          <Text style={styles.title}>{wording.title}</Text>
          <Text style={styles.body}>{wording.body}</Text>

          <Pressable
            style={[styles.confirm, busy && styles.inFlight]}
            onPress={onConfirm}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            accessibilityLabel={wording.confirmLabel}
          >
            <Text style={styles.confirmLabel}>{wording.confirmLabel}</Text>
          </Pressable>

          <Pressable
            style={styles.cancel}
            onPress={onDismiss}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={wording.cancelLabel}
          >
            <Text style={styles.cancelLabel}>{wording.cancelLabel}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}


const DRAWER_TRAVEL = 420;

const SWIPE_CLAIM_PX = 8;

const SWIPE_DISMISS_PX = 60;

const HANDLE_WIDTH = 36;

const HANDLE_HEIGHT = 4;

const CANCEL_HIT_AREA = 44;

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: workspaceColors.sheetScrim,
  },
  scrimTarget: {
    flex: 1,
  },
  drawer: {
    width: '100%',
    maxWidth: MOBILE_FRAME_WIDTH,
    backgroundColor: workspaceColors.surface,
    borderTopLeftRadius: workspaceRadii.drawer,
    borderTopRightRadius: workspaceRadii.drawer,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 26,
    gap: 8,
  },
  handle: {
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    borderRadius: workspaceRadii.pill,
    backgroundColor: workspaceColors.drawerHandle,
    alignSelf: 'center',
  },
  title: {
    ...workspaceTypography.drawerTitle,
    color: workspaceColors.drawerTitle,
    marginTop: 6,
  },
  body: {
    ...workspaceTypography.drawerBody,
    color: workspaceColors.drawerBody,
  },
  confirm: {
    height: workspaceMetrics.drawerCtaHeight,
    borderRadius: workspaceRadii.control,
    backgroundColor: workspaceColors.drawerAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  confirmLabel: {
    ...workspaceTypography.drawerCta,
    color: workspaceColors.onAccent,
  },
  inFlight: {
    opacity: sheetMotion.inFlightOpacity,
  },
  cancel: {
    minHeight: CANCEL_HIT_AREA,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
  },
  cancelLabel: {
    ...workspaceTypography.drawerCancel,
    color: workspaceColors.drawerBody,
  },
});
