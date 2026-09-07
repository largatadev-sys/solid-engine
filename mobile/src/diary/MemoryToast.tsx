import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';
import { MemoryIcon } from './MemoryIcon';


export type ToastTone = 'success' | 'failure';


interface Toast {
  readonly message: string;
  readonly tone: ToastTone;
  readonly key: number;
}


let present: ((toast: Toast) => void) | null = null;
let issued = 0;


export function showMemoryToast(message: string, tone: ToastTone = 'success'): boolean {
  if (present === null) return false;
  issued += 1;
  present({ message, tone, key: issued });
  return true;
}


export function MemoryToastStation() {
  const [toast, setToast] = useState<Toast | null>(null);
  const travel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    present = (next) => setToast(next);
    return () => {
      present = null;
    };
  }, []);

  useEffect(() => {
    if (toast === null) return undefined;

    travel.setValue(0);
    const played = Animated.sequence([
      Animated.timing(travel, {
        toValue: 1,
        duration: memoryMotion.toastInMs,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.delay(memoryMotion.toastHoldMs),
      Animated.timing(travel, {
        toValue: 2,
        duration: memoryMotion.toastOutMs,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]);

    played.start(({ finished }) => {
      if (finished) setToast((current) => (current?.key === toast.key ? null : current));
    });
    return () => played.stop();
  }, [toast, travel]);

  if (toast === null) return null;

  const success = toast.tone === 'success';

  return (
    <Animated.View
      key={toast.key}
      style={[
        styles.toast,
        success ? styles.success : styles.failure,
        {
          opacity: travel.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
          transform: [
            {
              translateY: travel.interpolate({
                inputRange: [0, 1, 2],
                outputRange: [memoryMotion.toastTravel, 0, memoryMotion.toastOutTravel],
              }),
            },
          ],
        },
      ]}
      accessibilityLiveRegion="polite"
      pointerEvents="none"
    >
      {success && (
        <MemoryIcon name="checkCircle" size={18} color={memoryColors.successInk} strokeWidth={2.2} />
      )}
      <Text style={[styles.ink, success ? styles.successInk : styles.failureInk]}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: memoryMetrics.toastTop,
    left: memoryMetrics.toastSide,
    right: memoryMetrics.toastSide,
    borderRadius: memoryMetrics.toastRadius,
    paddingVertical: memoryMetrics.toastPaddingV,
    paddingHorizontal: memoryMetrics.toastPaddingH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 20,
  },
  success: {
    backgroundColor: memoryColors.successWell,
    shadowColor: memoryColors.successInk,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  failure: {
    backgroundColor: memoryColors.darkToastWell,
  },
  ink: {
    ...memoryTypography.toast,
    flex: 1,
  },
  successInk: {
    color: memoryColors.successInk,
  },
  failureInk: {
    color: memoryColors.darkToastInk,
  },
});
