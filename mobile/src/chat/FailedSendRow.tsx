import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { chatColors, chatCopy, chatMetrics, chatMotion, chatTypography } from '../theme/workspaceTokens';


interface FailedSendRowProps {
  readonly onRetry: () => void;
  readonly onDiscard: () => void;
}


export function FailedSendRow({ onRetry, onDiscard }: FailedSendRowProps) {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: chatMotion.stateChangeMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  return (
    <Animated.View style={[styles.row, { opacity: entrance }]}>
      <Text style={styles.failure}>{chatCopy.failed}</Text>
      <TextAction label={chatCopy.retry} tint={chatColors.retry} onPress={onRetry} />
      <TextAction label={chatCopy.discard} tint={chatColors.discard} onPress={onDiscard} />
    </Animated.View>
  );
}


function TextAction({
  label,
  tint,
  onPress,
}: {
  readonly label: string;
  readonly tint: string;
  readonly onPress: () => void;
}) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={chatMetrics.hitSlop}
      style={StyleSheet.flatten([styles.action, press.style])}
    >
      <Text style={[styles.actionLabel, { color: tint }]}>{label}</Text>
    </AnimatedPressable>
  );
}


const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingRight: 2,
  },
  failure: {
    ...chatTypography.failure,
    color: chatColors.failure,
  },
  action: {
    padding: 4,
    flexShrink: 0,
  },
  actionLabel: {
    ...chatTypography.action,
  },
});
