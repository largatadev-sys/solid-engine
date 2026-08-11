import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { MY_DIARY_EMPTY, MY_DIARY_TITLE } from './diaryCopy';
import { tripEntryCountLabel } from './postcardAnatomy';
import { useMyDiaryTrips } from '../query/diaryQueries';
import { colors, radii, spacing, typography } from '../theme';

const CARD_MAX_WIDTH = 420;


export function MyDiarySection() {
  const router = useRouter();
  const trips = useMyDiaryTrips();
  const rows = (trips.data?.pages ?? []).flatMap((page) => page.items);

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{MY_DIARY_TITLE}</Text>

      {trips.isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : rows.length === 0 ? (
        <Text style={styles.empty}>{MY_DIARY_EMPTY}</Text>
      ) : (
        <View style={styles.list}>
          {rows.map((trip) => (
            <Pressable
              key={trip.itineraryId}
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: '/itineraries/[id]/diary',
                  params: { id: trip.itineraryId },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Open your diary for ${trip.title ?? 'this trip'}`}
            >
              <View style={styles.rowText}>
                <Text style={styles.tripTitle} numberOfLines={1}>
                  {trip.title ?? 'Untitled trip'}
                </Text>
                <Text style={styles.tripMeta}>{tripEntryCountLabel(trip.entryCount)}</Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.textSecondary} />
            </Pressable>
          ))}

          {trips.hasNextPage === true ? (
            <Pressable
              style={styles.more}
              onPress={() => void trips.fetchNextPage()}
              accessibilityRole="button"
              accessibilityLabel="Show more diary trips"
            >
              <Text style={styles.moreLabel}>Show more</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  section: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  heading: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  empty: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm3,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowText: {
    flex: 1,
    gap: spacing.hair,
  },
  tripTitle: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  tripMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  more: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  moreLabel: {
    ...typography.link,
    color: colors.accent,
  },
});
