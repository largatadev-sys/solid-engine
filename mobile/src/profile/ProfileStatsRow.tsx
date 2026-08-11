import { StyleSheet, Text, View } from 'react-native';
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
  TRIPS_STAT_LABEL,
} from './profileCopy';
import { stubFollowerCount, stubFollowingCount } from './stubMetrics';


export interface ProfileStats {
  readonly published: number | null;
  readonly trips: number | null;
}


export function ProfileStatsRow({ stats }: { readonly stats: ProfileStats }) {
  const cells = [
    { label: PUBLISHED_STAT_LABEL, value: stats.published },
    { label: TRIPS_STAT_LABEL, value: stats.trips },
    { label: FOLLOWERS_STAT_LABEL, value: stubFollowerCount() },
    { label: FOLLOWING_STAT_LABEL, value: stubFollowingCount() },
  ];

  return (
    <View style={styles.row}>
      {cells.map((cell, index) => (
        <View key={cell.label} style={[styles.cell, index > 0 && styles.divided]}>
          <Text style={styles.value}>{cell.value === null ? '—' : cell.value}</Text>
          <Text style={styles.label}>{cell.label}</Text>
        </View>
      ))}
    </View>
  );
}


const styles = StyleSheet.create({
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
