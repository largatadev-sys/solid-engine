import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';


export function ActivityKebab({
  activityTitle,
  onEdit,
  onDelete,
}: {
  activityTitle: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  const choose = (act: () => void) => () => {
    setOpen(false);
    act();
  };

  return (
    <View style={styles.anchor}>
      <Pressable
        onPress={() => setOpen((wasOpen) => !wasOpen)}
        accessibilityRole="button"
        accessibilityLabel={`Actions for ${activityTitle}`}
        accessibilityState={{ expanded: open }}
        hitSlop={spacing.sm}
      >
        <Text style={styles.dots}>⋮</Text>
      </Pressable>

      {open && (
        <View style={styles.menu}>
          <Pressable style={styles.item} onPress={choose(onEdit)} accessibilityRole="button">
            <Text style={styles.itemText}>Edit</Text>
          </Pressable>
          <Pressable style={styles.item} onPress={choose(onDelete)} accessibilityRole="button">
            <Text style={styles.destructiveText}>Delete</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const MENU_WIDTH = 128;

const styles = StyleSheet.create({
  anchor: { position: 'relative' },
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
    zIndex: 1,
  },
  item: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  itemText: { ...typography.body, color: colors.textPrimary },
  destructiveText: { ...typography.body, color: colors.danger },
});
