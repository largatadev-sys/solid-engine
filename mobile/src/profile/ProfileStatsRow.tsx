import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DIARIES_STAT_LABEL, ITINERARIES_STAT_LABEL } from '../diary/memoryCopy';
import { spacing } from '../theme';
import { profileColors, profileTypography } from '../theme/workspaceTokens';
import {
  FOLLOWERS_STAT_LABEL,
  FOLLOWING_STAT_LABEL,
  STATS_RETRY_LABEL,
  STATS_UNAVAILABLE,
} from './profileCopy';
import { StatCells } from './StatCells';


export interface ProfileStats {
  readonly diaries: number | null;
  readonly itineraries: number | null;
  readonly followers: number | null;
  readonly following: number | null;
  readonly failed: boolean;
  readonly retry: () => void;
  readonly openFollowers: () => void;
  readonly openFollowing: () => void;
}


export function ProfileStatsRow({ stats }: { readonly stats: ProfileStats }) {
  const cells = [
    { label: DIARIES_STAT_LABEL, value: stats.diaries, open: null },
    { label: ITINERARIES_STAT_LABEL, value: stats.itineraries, open: null },
    { label: FOLLOWERS_STAT_LABEL, value: stats.followers, open: stats.openFollowers },
    { label: FOLLOWING_STAT_LABEL, value: stats.following, open: stats.openFollowing },
  ];

  return (
    <View style={styles.stack}>
      <StatCells cells={cells} />

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
});
