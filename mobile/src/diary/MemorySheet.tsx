import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';
import { CANCEL_ACTION } from './memoryCopy';


interface MemorySheetProps {
  readonly open: boolean;
  readonly title?: string;
  readonly subtitle?: string;
  readonly contextLabel?: string;
  readonly leading?: ReactNode;
  readonly cancel?: boolean;
  readonly scrolls?: boolean;
  readonly onDismiss: () => void;
  readonly children: ReactNode;
}


export function MemorySheet({
  open,
  title,
  subtitle,
  contextLabel,
  leading,
  cancel = false,
  scrolls = false,
  onDismiss,
  children,
}: MemorySheetProps) {
  const { height } = useWindowDimensions();
  const travel = useRef(new Animated.Value(1)).current;
  const scrim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
    Animated.parallel([
      Animated.timing(scrim, {
        toValue: open ? 1 : 0,
        duration: memoryMotion.scrimMs,
        useNativeDriver: true,
      }),
      Animated.timing(travel, {
        toValue: open ? 0 : 1,
        duration: open ? memoryMotion.sheetInMs : memoryMotion.sheetOutMs,
        easing: open ? Easing.bezier(...memoryMotion.sheetBezier) : Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
  }, [open, scrim, travel]);

  if (!mounted) return null;

  const translateY = travel.interpolate({ inputRange: [0, 1], outputRange: [0, height] });

  return (
    <Modal visible transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.host}>
        <Animated.View style={[styles.scrim, { opacity: scrim }]}>
          <Pressable
            style={styles.scrimTarget}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            onPress={onDismiss}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            scrolls ? { maxHeight: height * memoryMetrics.sheetMaxShare } : null,
            { transform: [{ translateY }] },
          ]}
        >
          <View style={styles.grabber} />

          {contextLabel !== undefined && <Text style={styles.contextLabel}>{contextLabel}</Text>}

          {(title !== undefined || leading !== undefined) && (
            <View style={styles.titleRow}>
              {leading}
              <View style={styles.titleText}>
                {title !== undefined && <Text style={styles.title}>{title}</Text>}
                {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
            </View>
          )}

          {scrolls ? (
            <ScrollView style={styles.scroller} bounces={false}>
              {children}
            </ScrollView>
          ) : (
            <View>{children}</View>
          )}

          {cancel && (
            <Pressable
              style={({ pressed }) =>
                StyleSheet.flatten([styles.cancel, pressed ? styles.pressed : null])
              }
              accessibilityRole="button"
              accessibilityLabel={CANCEL_ACTION}
              onPress={onDismiss}
            >
              <Text style={styles.cancelInk}>{CANCEL_ACTION}</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  host: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: memoryColors.scrim,
  },
  scrimTarget: {
    flex: 1,
  },
  sheet: {
    width: '100%',
    maxWidth: memoryMetrics.frameWidth,
    backgroundColor: memoryColors.card,
    borderTopLeftRadius: memoryMetrics.sheetRadius,
    borderTopRightRadius: memoryMetrics.sheetRadius,
    paddingTop: memoryMetrics.sheetPaddingTop,
    paddingHorizontal: memoryMetrics.sheetPaddingH,
    paddingBottom: 24,
  },
  grabber: {
    width: memoryMetrics.grabberWidth,
    height: memoryMetrics.grabberHeight,
    borderRadius: memoryMetrics.grabberHeight / 2,
    backgroundColor: memoryColors.hairline,
    alignSelf: 'center',
    marginBottom: 6,
  },
  contextLabel: {
    ...memoryTypography.contextLabel,
    color: memoryColors.muted,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  titleText: {
    flex: 1,
  },
  title: {
    ...memoryTypography.screenTitle,
    color: memoryColors.title,
  },
  subtitle: {
    ...memoryTypography.subtitle,
    color: memoryColors.muted,
    marginTop: 2,
  },
  scroller: {
    flexGrow: 0,
  },
  cancel: {
    marginTop: 12,
    height: memoryMetrics.cancelHeight,
    borderRadius: memoryMetrics.cancelRadius,
    backgroundColor: memoryColors.cancelWell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelInk: {
    ...memoryTypography.sheetRow,
    color: memoryColors.title,
  },
  pressed: {
    opacity: memoryMotion.pressOpacity,
  },
});
