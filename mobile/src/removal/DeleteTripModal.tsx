import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { MOBILE_FRAME_WIDTH } from '../components/mobileFrameContract';
import { stillShowing } from '../components/stillShowing';
import { useReducedMotion } from '../components/useReducedMotion';
import { spacing } from '../theme';
import { removalColors, removalMetrics, removalMotion, removalTypography } from '../theme/removalTokens';
import type { ItineraryResponse } from '../types/api';
import {
  DELETE_TRIP_BODY,
  DELETE_TRIP_CANCEL_LABEL,
  DELETE_TRIP_CTA_LABEL,
  DELETE_TRIP_SCRIM_LABEL,
  deleteTripAcknowledgement,
  deleteTripTitle,
} from './removalCopy';


interface DeleteTripModalProps {
  readonly trip: ItineraryResponse | null;
  readonly onCancel: () => void;
  readonly onConfirm: (trip: ItineraryResponse) => void;
}


export function DeleteTripModal({ trip, onCancel, onConfirm }: DeleteTripModalProps) {
  const [last, setLast] = useState<ItineraryResponse | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;
  const arming = useRef(new Animated.Value(0)).current;
  const ticking = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  if (trip !== null && trip !== last) setLast(trip);

  const shown = stillShowing(trip, last);
  const open = trip !== null;

  useEffect(() => {
    if (open) setAcknowledged(false);
  }, [open]);

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: open ? 1 : 0,
      duration: reducedMotion ? 0 : removalMotion.modalInMs,
      easing: Easing.bezier(0.2, 0.7, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [entrance, open, reducedMotion]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(arming, {
        toValue: acknowledged ? 1 : 0,
        duration: reducedMotion ? 0 : removalMotion.ctaSwapMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(ticking, {
        toValue: acknowledged ? 1 : 0,
        duration: reducedMotion ? 0 : removalMotion.ackTickMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [acknowledged, arming, reducedMotion, ticking]);

  if (shown === null) {
    return null;
  }

  const scale = reducedMotion
    ? 1
    : entrance.interpolate({
        inputRange: [0, 1],
        outputRange: [removalMotion.modalFromScale, 1],
      });

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onCancel}>
      <View style={styles.stage}>
        <Animated.View style={[styles.scrim, { opacity: entrance }]}>
          <Pressable
            style={styles.scrimTarget}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={DELETE_TRIP_SCRIM_LABEL}
          />
        </Animated.View>

        <Animated.View
          style={[styles.card, { opacity: entrance, transform: [{ scale }] }]}
        >
          <Text style={styles.title}>{deleteTripTitle(shown.title)}</Text>
          <Text style={styles.body}>{DELETE_TRIP_BODY}</Text>

          <Pressable
            style={styles.ack}
            onPress={() => setAcknowledged((ticked) => !ticked)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acknowledged }}
            accessibilityLabel={deleteTripAcknowledgement(shown.memberCount ?? 1)}
          >
            <Animated.View
              style={[
                styles.ackBox,
                {
                  backgroundColor: ticking.interpolate({
                    inputRange: [0, 1],
                    outputRange: [removalColors.ackWell, removalColors.ackFill],
                  }),
                  borderColor: ticking.interpolate({
                    inputRange: [0, 1],
                    outputRange: [removalColors.ackBoxBorder, removalColors.ackFill],
                  }),
                },
              ]}
            >
              {acknowledged && (
                <Icon
                  name="check"
                  size={removalMetrics.ackTickGlyph}
                  color={removalColors.ackTick}
                />
              )}
            </Animated.View>
            <Text style={styles.ackLabel}>
              {deleteTripAcknowledgement(shown.memberCount ?? 1)}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onConfirm(shown)}
            disabled={!acknowledged}
            accessibilityRole="button"
            accessibilityState={{ disabled: !acknowledged }}
            accessibilityLabel={DELETE_TRIP_CTA_LABEL}
          >
            <Animated.View
              style={[
                styles.cta,
                {
                  backgroundColor: arming.interpolate({
                    inputRange: [0, 1],
                    outputRange: [removalColors.ctaIdleWell, removalColors.ctaArmedWell],
                  }),
                },
              ]}
            >
              <Animated.Text
                style={[
                  styles.ctaLabel,
                  {
                    color: arming.interpolate({
                      inputRange: [0, 1],
                      outputRange: [removalColors.ctaIdleInk, removalColors.ctaArmedInk],
                    }),
                  },
                ]}
              >
                {DELETE_TRIP_CTA_LABEL}
              </Animated.Text>
            </Animated.View>
          </Pressable>

          <Pressable
            style={styles.cancel}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={DELETE_TRIP_CANCEL_LABEL}
          >
            <Text style={styles.cancelLabel}>{DELETE_TRIP_CANCEL_LABEL}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: removalMetrics.modalInset,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: removalColors.modalScrim,
  },
  scrimTarget: {
    flex: 1,
  },
  card: {
    width: '100%',
    maxWidth: MOBILE_FRAME_WIDTH,
    backgroundColor: removalColors.modalSurface,
    borderRadius: removalMetrics.modalRadius,
    paddingHorizontal: removalMetrics.modalPaddingH,
    paddingTop: removalMetrics.modalPaddingTop,
    paddingBottom: removalMetrics.modalPaddingBottom,
    shadowColor: removalColors.modalTitle,
    shadowOffset: { width: 0, height: removalMetrics.modalShadowOffset },
    shadowOpacity: removalMetrics.modalShadowOpacity,
    shadowRadius: removalMetrics.modalShadowRadius,
    elevation: removalMetrics.modalElevation,
  },
  title: {
    ...removalTypography.modalTitle,
    color: removalColors.modalTitle,
    paddingBottom: spacing.sm,
  },
  body: {
    ...removalTypography.modalBody,
    color: removalColors.modalBody,
    paddingBottom: spacing.sm3,
  },
  ack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: removalMetrics.ackGap,
    backgroundColor: removalColors.ackWell,
    borderWidth: 1,
    borderColor: removalColors.ackBorder,
    borderRadius: removalMetrics.ackRadius,
    padding: removalMetrics.ackPadding,
    marginBottom: spacing.md,
  },
  ackBox: {
    width: removalMetrics.ackBox,
    height: removalMetrics.ackBox,
    borderRadius: removalMetrics.ackBoxRadius,
    borderWidth: removalMetrics.ackBoxBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  ackLabel: {
    ...removalTypography.ackLabel,
    color: removalColors.ackLabel,
    flex: 1,
  },
  cta: {
    height: removalMetrics.ctaHeight,
    borderRadius: removalMetrics.ctaRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    ...removalTypography.cta,
  },
  cancel: {
    minHeight: removalMetrics.cancelHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    ...removalTypography.cancel,
    color: removalColors.cancelInk,
  },
});
