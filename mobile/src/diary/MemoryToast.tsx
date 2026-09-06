import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';


let present: ((message: string) => void) | null = null;


export function showMemoryToast(message: string): boolean {
  if (present === null) return false;
  present(message);
  return true;
}


export function MemoryToastStation() {
  const [message, setMessage] = useState<string | null>(null);
  const travel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    present = (next) => setMessage(next);
    return () => {
      present = null;
    };
  }, []);

  useEffect(() => {
    if (message === null) return undefined;

    travel.setValue(0);
    const played = Animated.sequence([
      Animated.timing(travel, {
        toValue: 1,
        duration: memoryMotion.toastInMs,
        useNativeDriver: true,
      }),
      Animated.delay(memoryMotion.toastHoldMs),
      Animated.timing(travel, {
        toValue: 0,
        duration: memoryMotion.toastOutMs,
        useNativeDriver: true,
      }),
    ]);

    played.start(({ finished }) => {
      if (finished) setMessage(null);
    });
    return () => played.stop();
  }, [message, travel]);

  if (message === null) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity: travel,
          transform: [
            {
              translateY: travel.interpolate({
                inputRange: [0, 1],
                outputRange: [-memoryMotion.toastTravel, 0],
              }),
            },
          ],
        },
      ]}
      accessibilityLiveRegion="polite"
      pointerEvents="none"
    >
      <Text style={styles.ink}>{message}</Text>
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 12,
    left: memoryMetrics.screenPadding,
    right: memoryMetrics.screenPadding,
    backgroundColor: memoryColors.toastWell,
    borderRadius: memoryMetrics.toastRadius,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 20,
  },
  ink: {
    ...memoryTypography.toast,
    color: memoryColors.toastInk,
    textAlign: 'center',
  },
});
