import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import type { ItineraryResponse } from '../types/api';
import { formatDates } from './formatDates';


export function TripRow({ itinerary }: { itinerary: ItineraryResponse }) {
  return (
    <Link href={`/itineraries/${itinerary.id}`} asChild>
      <Pressable style={styles.row} accessibilityRole="button">
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {itinerary.title}
          </Text>
          {itinerary.archived && (
            <View style={styles.badges}>
              <View style={[styles.stateBadge, styles.archivedBadge]}>
                <Text style={[styles.stateBadgeText, styles.archivedBadgeText]}>Archived</Text>
              </View>
            </View>
          )}
        </View>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {itinerary.destinations.join(' · ')}
        </Text>
        <Text style={styles.rowDates}>{formatDates(itinerary)}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowTitle: { ...typography.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
  badges: { flexDirection: 'row', gap: spacing.xs },
  stateBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  stateBadgeText: { ...typography.caption, color: colors.textSecondary },
  archivedBadge: { borderColor: colors.accentMuted },
  archivedBadgeText: { color: colors.accent },
  rowMeta: { ...typography.body, color: colors.textSecondary },
  rowDates: { ...typography.caption, color: colors.textSecondary },
});
