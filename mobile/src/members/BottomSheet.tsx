import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { MOBILE_FRAME_WIDTH } from '../components/mobileFrameContract';
import { useReducedMotion } from '../components/useReducedMotion';
import {
  travelerColors,
  travelerMetrics,
  travelerMotion,
  travelerRadii,
  travelerTypography,
} from '../theme/workspaceTokens';
import { SHEET_DISMISS_LABEL } from './travelerCopy';


const SWIPE_CLAIM_PX = 8;

const SWIPE_DISMISS_PX = 60;



interface BottomSheetProps {
  readonly open: boolean;
  readonly title: string;
  readonly onDismiss: () => void;
  readonly children: ReactNode;
}


export function BottomSheet({ open, title, onDismiss, children }: BottomSheetProps) {
  const travel = useRef(new Animated.Value(0)).current;
  const scrim = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(open);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  if (open && !mounted) setMounted(true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scrim, {
        toValue: open ? 1 : 0,
        duration: open ? travelerMotion.scrimInMs : travelerMotion.scrimOutMs,
        easing: open ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(travel, {
        toValue: open ? 1 : 0,
        duration: reducedMotion ? 0 : open ? travelerMotion.sheetInMs : travelerMotion.sheetOutMs,
        easing: open ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
  }, [open, reducedMotion, scrim, travel]);

  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > SWIPE_CLAIM_PX,
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > SWIPE_DISMISS_PX) dismiss.current();
      },
    }),
  ).current;

  if (!mounted) {
    return null;
  }

  const translateY = travel.interpolate({
    inputRange: [0, 1],
    outputRange: [travelerMotion.sheetTravelPx, 0],
  });

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.stage}>
        <Animated.View style={[styles.scrim, { opacity: scrim }]}>
          <Pressable
            style={styles.scrimTarget}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={SHEET_DISMISS_LABEL}
          />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} {...swipe.panHandlers}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{title}</Text>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  stage: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: travelerColors.scrim,
  },
  scrimTarget: {
    flex: 1,
  },
  sheet: {
    width: '100%',
    maxWidth: MOBILE_FRAME_WIDTH,
    backgroundColor: travelerColors.surface,
    borderTopLeftRadius: travelerRadii.sheet,
    borderTopRightRadius: travelerRadii.sheet,
    paddingTop: 10,
    paddingBottom: 24,
    shadowColor: travelerColors.ink,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 32,
    elevation: 16,
  },
  grabber: {
    width: travelerMetrics.grabberWidth,
    height: travelerMetrics.grabberHeight,
    borderRadius: travelerRadii.pill,
    backgroundColor: travelerColors.hairline,
    alignSelf: 'center',
    marginBottom: 10,
  },
  title: {
    ...travelerTypography.sheetTitle,
    color: travelerColors.ink,
    paddingHorizontal: travelerMetrics.menuEntryPaddingH,
    paddingTop: 4,
    paddingBottom: 12,
  },
});
