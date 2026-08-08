import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { coverPreviewFor } from '../media/coverInFlight';
import { MediaThumb } from '../media/MediaThumb';
import { colors, radii, spacing, typography } from '../theme';
import type { ItineraryResponse } from '../types/api';
import { publicationBadge, tripCardDate } from './tripCardAnatomy';
import { draftSubtitle, editingAdvisory } from './tripSections';


export function tripRowDestination(
  itinerary: Pick<ItineraryResponse, 'id' | 'archived' | 'published' | 'state'>,
) {
  if (!itinerary.archived && itinerary.published) {
    return { pathname: '/published/[id]' as const, params: { id: itinerary.id } };
  }
  return { pathname: '/itineraries/[id]' as const, params: { id: itinerary.id } };
}


export function TripRow({ itinerary }: { itinerary: ItineraryResponse }) {
  const advisory = editingAdvisory(itinerary);
  const subtitle = draftSubtitle(itinerary);
  const date = tripCardDate(itinerary);
  const badge = publicationBadge(itinerary);

  return (
    <Link href={tripRowDestination(itinerary)} asChild>
      <Pressable style={styles.card} accessibilityRole="button" accessibilityLabel={itinerary.title}>
        <CoverThumb
          coverImageUrl={itinerary.coverImageUrl}
          localPreview={coverPreviewFor(itinerary.id)}
        />

        <View style={styles.info}>
          <View style={styles.titleWrap}>
            {date !== null && <Text style={styles.date}>{date}</Text>}
            <Text style={styles.title} numberOfLines={1}>
              {itinerary.title}
            </Text>
          </View>

          {subtitle !== null && <Text style={styles.subtitle}>{subtitle}</Text>}

          {advisory !== null && (
            <View style={styles.status}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{advisory}</Text>
            </View>
          )}
        </View>

        <View style={styles.badges}>
          {itinerary.archived && (
            <View style={styles.archivedBadge}>
              <Text style={styles.archivedBadgeText}>Archived</Text>
            </View>
          )}
          {badge !== null && (
            <View style={styles.publicationBadge}>
              <Text style={styles.publicationBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Link>
  );
}


function CoverThumb({
  coverImageUrl,
  localPreview,
}: {
  coverImageUrl: string | null;
  localPreview: string | null;
}) {
  return (
    <MediaThumb
      url={coverImageUrl}
      localPreview={localPreview}
      style={styles.thumb}
      fallbackStyle={styles.thumbEmpty}
      accessibilityLabel="Trip cover photo"
      fallback={<Icon name="map" size={THUMB_ICON_SIZE} color={colors.textSecondary} />}
    />
  );
}

const THUMB_SIZE = 76;

const THUMB_ICON_SIZE = 24;

const STATUS_DOT_SIZE = 8;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm3,
    padding: spacing.sm3,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: spacing.xs2 },
  titleWrap: { gap: spacing.hair },
  date: { ...typography.cardDate, color: colors.textSecondary },
  title: { ...typography.cardTitle, color: colors.textPrimary },
  subtitle: { ...typography.cardSubtitle, color: colors.textSecondary },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs2 },
  statusDot: {
    width: STATUS_DOT_SIZE,
    height: STATUS_DOT_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  statusText: { ...typography.cardStatus, color: colors.textSecondary },
  badges: { alignItems: 'flex-end', gap: spacing.xs },
  archivedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.hair,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.background,
  },
  archivedBadgeText: { ...typography.cardStatus, color: colors.accent },
  publicationBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.hair,
    borderRadius: radii.pill,
    backgroundColor: colors.accentTint,
  },
  publicationBadgeText: { ...typography.cardStatus, color: colors.accent },
});
