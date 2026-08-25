import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { coverPreviewFor } from '../media/coverInFlight';
import { MediaThumb } from '../media/MediaThumb';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { colors, radii, spacing, typography } from '../theme';
import { tripTabColors } from '../theme/workspaceTokens';
import type { ItineraryResponse } from '../types/api';
import { LiveAdvisory } from '../components/LiveAdvisory';
import { LivePulse } from '../components/LivePulse';
import { LiveValue } from '../components/LiveValue';
import { publicationBadge } from './tripCardAnatomy';
import { editingAdvisory, tripCardSubline } from './tripTabs';


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
  const subline = tripCardSubline(itinerary);
  const badge = publicationBadge(itinerary);
  const { opacity, onPressIn, onPressOut } = usePressFeedback();

  return (
    <Link href={tripRowDestination(itinerary)} asChild>
      <AnimatedPressable
        style={StyleSheet.flatten([styles.card, { opacity }])}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={itinerary.title}>
        <CoverThumb
          coverImageUrl={itinerary.coverImageUrl}
          localPreview={coverPreviewFor(itinerary.id)}
        />

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {itinerary.title}
          </Text>

          <LiveValue value={subline}>
            <Text style={styles.subline} numberOfLines={1}>
              {subline}
            </Text>
          </LiveValue>

          <LiveAdvisory showing={advisory !== null}>
            <View style={styles.status}>
              <LivePulse style={styles.statusDot} />
              <Text style={styles.statusText}>{advisory}</Text>
            </View>
          </LiveAdvisory>
        </View>

        {badge !== null && (
          <View style={styles.publicationBadge}>
            <Text style={styles.publicationBadgeText}>{badge}</Text>
          </View>
        )}
      </AnimatedPressable>
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
  info: { flex: 1, gap: spacing.hair },
  title: { ...typography.cardTitle, color: colors.textPrimary },
  subline: { ...typography.cardSubtitle, color: colors.textSecondary },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs2 },
  statusDot: {
    width: STATUS_DOT_SIZE,
    height: STATUS_DOT_SIZE,
    borderRadius: radii.pill,
    backgroundColor: tripTabColors.advisoryDot,
  },
  statusText: { ...typography.cardStatus, color: tripTabColors.advisoryText },
  publicationBadge: {
    flexShrink: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.hair,
    borderRadius: radii.pill,
    backgroundColor: colors.accentTint,
  },
  publicationBadgeText: { ...typography.cardStatus, color: colors.accent },
});
