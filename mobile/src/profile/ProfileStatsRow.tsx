import { Pressable, StyleSheet, Text, View } from 'react-native';
import { spacing } from '../theme';
import {
  profileColors,
  profileMetrics,
  profileTypography,
  workspaceColors,
} from '../theme/workspaceTokens';
import {
  FOLLOWERS_STAT_LABEL,
  FOLLOWING_STAT_LABEL,
  PUBLISHED_STAT_LABEL,
  STATS_RETRY_LABEL,
  STATS_UNAVAILABLE,
  TRIPS_STAT_LABEL,
} from './profileCopy';
import { stubFollowerCountFor, stubFollowingCountFor } from './stubMetrics';


export interface ProfileStats {
  readonly published: number | null;
  readonly trips: number | null;
  readonly failed: boolean;
  readonly retry: () => void;
}


export function ProfileStatsRow({
  stats,
  subjectId,
}: {
  readonly stats: ProfileStats;
  readonly subjectId: string;
}) {
  const cells = [
    { label: PUBLISHED_STAT_LABEL, value: stats.published },
    { label: TRIPS_STAT_LABEL, value: stats.trips },
    { label: FOLLOWERS_STAT_LABEL, value: stubFollowerCountFor(subjectId) },
    { label: FOLLOWING_STAT_LABEL, value: stubFollowingCountFor(subjectId) },
  ];

  return (
    <View style={styles.stack}>
      <View style={styles.row}>
        {cells.map((cell, index) => (
          <View key={cell.label} style={[styles.cell, index > 0 && styles.divided]}>
            <Text style={styles.value}>{cell.value === null ? '—' : cell.value}</Text>
            <Text style={styles.label}>{cell.label}</Text>
          </View>
        ))}
      </View>

      {stats.failed && (
        <Pressable
          onPress={stats.retry}
          accessibilityRole="button"
          accessibilityLabel={STATS_RETRY_LABEL}
        >
          <Text style={styles.failed}>{STATS_UNAVAILABLE}</Text>
        </Pressable>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  stack: {
    gap: spacing.xs,
  },
  failed: {
    ...profileTypography.statLabel,
    color: profileColors.meta,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: profileMetrics.statsRadius,
    paddingVertical: spacing.sm2,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.hair,
  },
  divided: {
    borderLeftWidth: 1,
    borderLeftColor: profileColors.cellDivider,
  },
  value: {
    ...profileTypography.statValue,
    color: workspaceColors.title,
  },
  label: {
    ...profileTypography.statLabel,
    color: profileColors.meta,
  },
});
