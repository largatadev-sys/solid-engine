import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';


interface MemoryCtaProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly busy?: boolean;
  readonly inset?: boolean;
}


export function MemoryCta({
  label,
  onPress,
  disabled = false,
  busy = false,
  inset = true,
}: MemoryCtaProps) {
  const inert = disabled || busy;

  return (
    <View style={inset ? styles.inset : null}>
      <Pressable
        style={({ pressed }) =>
          StyleSheet.flatten([
            styles.cta,
            inert ? styles.ctaDisabled : null,
            pressed && !inert ? styles.ctaPressed : null,
          ])
        }
        disabled={inert}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: inert, busy }}
        onPress={onPress}
      >
        {busy ? (
          <ActivityIndicator color={memoryColors.white} />
        ) : (
          <Text style={styles.ink}>{label}</Text>
        )}
      </Pressable>
    </View>
  );
}


const styles = StyleSheet.create({
  inset: {
    paddingHorizontal: memoryMetrics.ctaSideMargin,
  },
  cta: {
    height: memoryMetrics.ctaHeight,
    borderRadius: memoryMetrics.ctaRadius,
    backgroundColor: memoryColors.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    backgroundColor: memoryColors.ctaDisabled,
  },
  ctaPressed: {
    transform: [{ scale: memoryMotion.ctaPressScale }],
  },
  ink: {
    ...memoryTypography.cta,
    color: memoryColors.white,
  },
});
