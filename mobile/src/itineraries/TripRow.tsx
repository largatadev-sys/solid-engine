import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import type { ItineraryResponse } from '../types/api';
import { formatDates } from './formatDates';
import { formatItineraryState } from './formatItineraryState';

/**
 * One trip card, shared by My Trips and the archived view (S1.9).
 *
 * <p>Extracted from `app/index.tsx` when the archived list arrived, rather than copied: two lists
 * rendering "the same" row is exactly how a badge gets added to one and forgotten on the other. The
 * archived view is My Trips asking a different question, so its rows should be indistinguishable
 * except for the fact that distinguishes them.
 */
export function TripRow({ itinerary }: { itinerary: ItineraryResponse }) {
  return (
    <Link href={`/itineraries/${itinerary.id}`} asChild>
      <Pressable style={styles.row} accessibilityRole="button">
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {itinerary.title}
          </Text>
          <View style={styles.badges}>
            {/* Archived is its own badge beside the lifecycle one, never a value inside it: the two
                machines are orthogonal, so a trip can read Completed *and* Archived (S1.9). */}
            {itinerary.archived && (
              <View style={[styles.stateBadge, styles.archivedBadge]}>
                <Text style={[styles.stateBadgeText, styles.archivedBadgeText]}>Archived</Text>
              </View>
            )}
            {/* The lifecycle phase, member-visible (S1.7): a workspace-visible fact, and the answer to
                "which of these trips have I actually taken?" without opening any of them. */}
            <View style={styles.stateBadge}>
              <Text style={styles.stateBadgeText}>{formatItineraryState(itinerary.state)}</Text>
            </View>
          </View>
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
