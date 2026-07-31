import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';


export function WorkspaceChip({ archived }: { archived: boolean }) {
  return (
    <View style={styles.chip}>
      <View style={[styles.dot, archived ? styles.dotArchived : styles.dotActive]} />
      <Text style={styles.text}>{archived ? 'Archived' : 'Active'}</Text>
    </View>
  );
}

const DOT_SIZE = 8;

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: radii.pill },
  dotActive: { backgroundColor: colors.success },
  dotArchived: { backgroundColor: colors.textSecondary },
  text: { ...typography.caption, color: colors.textPrimary },
});
