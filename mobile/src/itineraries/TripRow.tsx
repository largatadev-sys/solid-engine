import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import type { ItineraryResponse } from '../types/api';
import { formatDates } from './formatDates';
import { draftSubtitle, editingAdvisory } from './tripSections';


export function tripRowDestination(
  itinerary: Pick<ItineraryResponse, 'id' | 'archived' | 'published'>,
) {
  if (itinerary.archived || !itinerary.published) {
    return { pathname: '/itineraries/[id]' as const, params: { id: itinerary.id } };
  }
  return { pathname: '/published/[id]' as const, params: { id: itinerary.id } };
}


export function TripRow({ itinerary }: { itinerary: ItineraryResponse }) {
  const advisory = editingAdvisory(itinerary);
  const subtitle = draftSubtitle(itinerary);
  return (
    <Link href={tripRowDestination(itinerary)} asChild>
      <Pressable style={styles.row} accessibilityRole="button" accessibilityLabel={itinerary.title}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {itinerary.title}
          </Text>
          {itinerary.archived && (
            <View style={styles.archivedBadge}>
              <Text style={styles.archivedBadgeText}>Archived</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {itinerary.destinations.join(' · ')}
        </Text>
        <Text style={styles.rowDates}>{formatDates(itinerary)}</Text>
        {subtitle !== null && <Text style={styles.subtitle}>{subtitle}</Text>}
        {advisory !== null && (
          <View style={styles.advisory}>
            <View style={styles.advisoryDot} />
            <Text style={styles.advisoryText}>{advisory}</Text>
          </View>
        )}
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
  archivedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.background,
  },
  archivedBadgeText: { ...typography.caption, color: colors.accent },
  rowMeta: { ...typography.body, color: colors.textSecondary },
  rowDates: { ...typography.caption, color: colors.textSecondary },
  advisory: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  advisoryDot: { width: 8, height: 8, borderRadius: radii.pill, backgroundColor: colors.accent },
  advisoryText: { ...typography.caption, color: colors.textSecondary },
  subtitle: { ...typography.caption, color: colors.textSecondary },
});
