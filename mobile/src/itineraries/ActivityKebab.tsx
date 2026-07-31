import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';


export function ActivityKebab({
  activityTitle,
  open,
  onToggle,
  onEdit,
  onDelete,
}: {
  activityTitle: string;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.anchor}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`Actions for ${activityTitle}`}
        accessibilityState={{ expanded: open }}
        hitSlop={spacing.sm}
      >
        <Text style={styles.dots}>⋮</Text>
      </Pressable>

      {open && (
        <View style={styles.menu}>
          <Pressable style={styles.item} onPress={onEdit} accessibilityRole="button">
            <Text style={styles.itemText}>Edit</Text>
          </Pressable>
          <Pressable style={styles.item} onPress={onDelete} accessibilityRole="button">
            <Text style={styles.destructiveText}>Delete</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const MENU_WIDTH = 128;

const MENU_LAYER = 20;

const styles = StyleSheet.create({
  anchor: { position: 'relative', zIndex: MENU_LAYER },
  dots: { ...typography.bodyStrong, color: colors.textSecondary, paddingHorizontal: spacing.xs },
  menu: {
    position: 'absolute',
    top: spacing.lg,
    right: 0,
    width: MENU_WIDTH,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    zIndex: MENU_LAYER,
    elevation: MENU_LAYER,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.15,
    shadowRadius: radii.sm,
    shadowOffset: { width: 0, height: 2 },
  },
  item: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  itemText: { ...typography.body, color: colors.textPrimary },
  destructiveText: { ...typography.body, color: colors.danger },
});
