import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../../../src/components/Icon';
import {
  OPEN_WORKSPACE_LABEL,
  PREVIEW_TRIP_LABEL,
  TRIP_CREATED_TITLE,
  tripCreatedBody,
  tripCreatedMeta,
} from '../../../../../src/itineraries/tripCreatedCopy';
import { coverPreviewFor } from '../../../../../src/media/coverInFlight';
import { MediaThumb } from '../../../../../src/media/MediaThumb';
import { useItinerary } from '../../../../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../../../../src/theme';


export default function TripCreatedScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useItinerary(id);
  const insets = useSafeAreaInsets();

  const title = data?.title ?? 'Your trip';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.halo}>
          <Icon name="partyPopper" size={HALO_ICON_SIZE} color={colors.textPrimary} />
        </View>

        <View style={styles.message}>
          <Text style={styles.title}>{TRIP_CREATED_TITLE}</Text>
          <Text style={styles.body}>{tripCreatedBody(title)}</Text>
        </View>

        {data === undefined ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <View style={styles.summary}>
            <SummaryThumb coverImageUrl={data.coverImageUrl} localPreview={coverPreviewFor(id)} />
            <View style={styles.summaryText}>
              <Text style={styles.summaryTitle} numberOfLines={1}>
                {data.title}
              </Text>
              <Text style={styles.summaryMeta} numberOfLines={1}>
                {tripCreatedMeta({ destinations: data.destinations, days: data.days.length })}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          style={styles.primary}
          onPress={() => router.push({ pathname: '/itineraries/[id]', params: { id } })}
          accessibilityRole="button"
          accessibilityLabel={OPEN_WORKSPACE_LABEL}
        >
          <Text style={styles.primaryText}>{OPEN_WORKSPACE_LABEL}</Text>
          <Icon name="chevronRight" size={PRIMARY_ICON_SIZE} color={colors.textOnAccent} />
        </Pressable>

        <Pressable
          style={styles.secondary}
          onPress={() => router.push({ pathname: '/itineraries/[id]/preview', params: { id } })}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>{PREVIEW_TRIP_LABEL}</Text>
        </Pressable>
      </View>
    </View>
  );
}


function SummaryThumb({
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
      style={styles.summaryThumb}
      fallbackStyle={styles.summaryThumbEmpty}
      accessibilityLabel="Trip cover photo"
      fallback={<Icon name="map" size={THUMB_ICON_SIZE} color={colors.textSecondary} />}
    />
  );
}

const HALO_SIZE = 72;

const HALO_ICON_SIZE = 36;

const THUMB_SIZE = 64;

const THUMB_ICON_SIZE = 24;

const PRIMARY_ICON_SIZE = 18;

const PRIMARY_HEIGHT = 53;

const SECONDARY_HEIGHT = 46;

const CONTENT_GAP = 28;

const CONTENT_TOP = 40;

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'space-between', backgroundColor: colors.surface },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: CONTENT_TOP,
    gap: CONTENT_GAP,
  },
  halo: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { alignItems: 'center', gap: spacing.sm },
  title: { ...typography.heading, color: colors.textPrimary, textAlign: 'center' },
  body: { ...typography.overviewBody, color: colors.textSecondary, textAlign: 'center' },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: spacing.sm3,
    padding: spacing.sm3,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  summaryThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
  },
  summaryThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  summaryText: { flex: 1, gap: spacing.xs },
  summaryTitle: { ...typography.summaryTitle, color: colors.textPrimary },
  summaryMeta: { ...typography.summaryMeta, color: colors.textSecondary },
  actions: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm3 },
  primary: {
    flexDirection: 'row',
    height: PRIMARY_HEIGHT,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
  },
  primaryText: { ...typography.actionLarge, color: colors.textOnAccent },
  secondary: {
    height: SECONDARY_HEIGHT,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { ...typography.actionMedium, color: colors.textPrimary },
});
