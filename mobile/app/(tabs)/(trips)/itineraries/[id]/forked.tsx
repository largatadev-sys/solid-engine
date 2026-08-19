import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../../../src/components/Icon';
import { AttributionPill } from '../../../../../src/itineraries/AttributionPill';
import {
  FORK_SUCCESS_TITLE,
  OPEN_FORKED_WORKSPACE_LABEL,
  forkSuccessBody,
  forkSuccessMeta,
} from '../../../../../src/itineraries/forkCopy';
import { useItinerary } from '../../../../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../../../../src/theme';


export default function TripForkedScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useItinerary(id);
  const insets = useSafeAreaInsets();

  const title = data?.title ?? 'Your trip';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.halo}>
          <Icon name="fork" size={HALO_ICON_SIZE} color={colors.textPrimary} />
        </View>

        <View style={styles.message}>
          <Text style={styles.title}>{FORK_SUCCESS_TITLE}</Text>
          <Text style={styles.body}>{forkSuccessBody(title)}</Text>
        </View>

        {data === undefined ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <View style={styles.summary}>
              <View style={styles.summaryThumb} accessibilityLabel="Trip cover photo">
                <Icon name="map" size={THUMB_ICON_SIZE} color={colors.textSecondary} />
              </View>
              <View style={styles.summaryText}>
                <Text style={styles.summaryTitle} numberOfLines={1}>
                  {data.title}
                </Text>
                <Text style={styles.summaryMeta} numberOfLines={1}>
                  {forkSuccessMeta({ destination: data.destination, days: data.days.length })}
                </Text>
              </View>
            </View>

            <AttributionPill
              forkedFrom={data.forkedFrom}
              onOpenSource={(sourceId) =>
                router.push({ pathname: '/published/[id]', params: { id: sourceId } })
              }
            />
          </>
        )}
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          style={styles.primary}
          onPress={() => router.push({ pathname: '/itineraries/[id]', params: { id } })}
          accessibilityRole="button"
          accessibilityLabel={OPEN_FORKED_WORKSPACE_LABEL}
        >
          <Text style={styles.primaryText}>{OPEN_FORKED_WORKSPACE_LABEL}</Text>
          <Icon name="chevronRight" size={PRIMARY_ICON_SIZE} color={colors.textOnAccent} />
        </Pressable>
      </View>
    </View>
  );
}


const HALO_SIZE = 72;

const HALO_ICON_SIZE = 36;

const THUMB_SIZE = 64;

const THUMB_ICON_SIZE = 24;

const PRIMARY_ICON_SIZE = 18;

const PRIMARY_HEIGHT = 53;

const CONTENT_GAP = 20;

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
    alignItems: 'center',
    justifyContent: 'center',
  },
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
});
