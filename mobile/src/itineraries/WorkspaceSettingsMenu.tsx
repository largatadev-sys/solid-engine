import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, radii, spacing, typography } from '../theme';
import { MOBILE_FRAME_WIDTH } from '../components/mobileFrameContract';
import { workspaceColors } from '../theme/workspaceTokens';
import { WORKSPACE_MENU_LABELS, type WorkspaceMenuItem } from './tripSettingsItems';


interface WorkspaceSettingsMenuProps {
  readonly visible: boolean;
  readonly items: readonly WorkspaceMenuItem[];
  readonly anchorY: number;
  readonly onSelect: (item: WorkspaceMenuItem) => void;
  readonly onDismiss: () => void;
}


export function WorkspaceSettingsMenu({
  visible,
  items,
  anchorY,
  onSelect,
  onDismiss,
}: WorkspaceSettingsMenuProps) {
  const reveal = useSharedValue(0);

  useEffect(() => {
    reveal.value = withTiming(visible ? 1 : 0, {
      duration: OPEN_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, reveal]);

  const menuStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      { translateY: (reveal.value - 1) * RISE },
      { scaleY: MIN_SCALE + reveal.value * (1 - MIN_SCALE) },
    ],
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.screen}>
        <View style={styles.frame}>
          <Pressable
            style={styles.dismissLayer}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close trip settings"
          />

          <Animated.View style={[styles.menu, { top: anchorY + MENU_GAP }, menuStyle]}>
            {items.map((item, index) => (
              <View key={item}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={WORKSPACE_MENU_LABELS[item]}
                  onPress={() => onSelect(item)}
                >
                  <Text style={styles.rowLabel}>{WORKSPACE_MENU_LABELS[item]}</Text>
                </Pressable>
              </View>
            ))}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}


const MENU_WIDTH = 200;
const MENU_GAP = 28;
const OPEN_MS = 140;
const RISE = 6;
const MIN_SCALE = 0.92;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: MOBILE_FRAME_WIDTH,
  },
  dismissLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  menu: {
    position: 'absolute',
    right: spacing.md,
    width: MENU_WIDTH,
    transformOrigin: 'top',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    shadowColor: workspaceColors.title,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  rowLabel: {
    ...typography.label,
    color: colors.textPrimary,
  },
});
