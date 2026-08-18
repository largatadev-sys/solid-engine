import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { workspaceColors } from '../theme/workspaceTokens';
import { MOBILE_FRAME_WIDTH } from '../components/mobileFrameContract';
import {
  WORKSPACE_MENU_LABELS,
  type WorkspaceMenuItem,
} from './tripSettingsItems';

interface WorkspaceSettingsMenuProps {
  readonly visible: boolean;
  readonly items: readonly WorkspaceMenuItem[];
  readonly onSelect: (item: WorkspaceMenuItem) => void;
  readonly onDismiss: () => void;
}

export function WorkspaceSettingsMenu({
  visible,
  items,
  onSelect,
  onDismiss,
}: WorkspaceSettingsMenuProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.screen}>
        <View style={styles.frame}>
          <Pressable
            style={styles.scrim}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close trip settings"
          />

          <View style={styles.menu}>
            {items.map((item, index) => (
              <View key={item}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  style={styles.row}
                  accessibilityRole="button"
                  accessibilityLabel={WORKSPACE_MENU_LABELS[item]}
                  onPress={() => onSelect(item)}
                >
                  <Text style={styles.rowLabel}>{WORKSPACE_MENU_LABELS[item]}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const MENU_WIDTH = 200;
const MENU_TOP = 206;

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
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: workspaceColors.scrim,
  },
  menu: {
    position: 'absolute',
    top: MENU_TOP,
    right: spacing.md,
    width: MENU_WIDTH,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowLabel: {
    ...typography.label,
    color: colors.textPrimary,
  },
});
