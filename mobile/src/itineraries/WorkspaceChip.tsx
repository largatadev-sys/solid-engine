import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import type { ItineraryResponse } from '../types/api';


export function workspaceChipLabel(
  itinerary: Pick<ItineraryResponse, 'archived' | 'workspaceState'>,
): 'Active' | 'Archived' | null {
  if (itinerary.archived) return 'Archived';
  if (itinerary.workspaceState === 'completed') return null;
  return 'Active';
}


export function WorkspaceChip({
  itinerary,
}: {
  itinerary: Pick<ItineraryResponse, 'archived' | 'workspaceState'>;
}) {
  const label = workspaceChipLabel(itinerary);
  if (label === null) return null;

  return (
    <View style={styles.chip}>
      <View style={[styles.dot, label === 'Active' ? styles.dotActive : styles.dotArchived]} />
      <Text style={styles.text}>{label}</Text>
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
