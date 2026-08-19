import { StyleSheet, Text, View } from 'react-native';
import { MediaThumb } from '../media/MediaThumb';
import { initialsFor } from '../onboarding/initials';
import {
  pollColors,
  pollMetrics,
  pollTypography,
  workspaceColors,
  workspaceRadii,
} from '../theme/workspaceTokens';
import type { PollVoterResponse } from '../types/api';


const SHOWN = 5;


interface PollVoterClusterProps {
  readonly voters: readonly PollVoterResponse[];
  readonly voteCount: number;
}


export function PollVoterCluster({ voters, voteCount }: PollVoterClusterProps) {
  const shown = voters.slice(0, SHOWN);

  return (
    <View style={styles.cluster}>
      {shown.map((voter, index) => (
        <View
          key={voter.travelerId}
          style={[styles.avatarSlot, index > 0 && styles.overlapped]}
        >
          <MediaThumb
            url={voter.avatarUrl}
            style={styles.avatar}
            accessibilityLabel={`${voter.displayName} voted for this`}
            fallback={
              <Text style={styles.initials}>{initialsFor(voter.displayName, null)}</Text>
            }
          />
        </View>
      ))}
      <Text style={[styles.count, voteCount === 0 && styles.countEmpty]} numberOfLines={1}>
        {voteCount === 1 ? '1 vote' : `${voteCount} votes`}
      </Text>
    </View>
  );
}


const styles = StyleSheet.create({
  cluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSlot: {
    borderWidth: 1.5,
    borderColor: workspaceColors.surface,
    borderRadius: workspaceRadii.pill,
  },
  overlapped: {
    marginLeft: pollMetrics.avatarOverlap,
  },
  avatar: {
    width: pollMetrics.avatarSize,
    height: pollMetrics.avatarSize,
    borderRadius: workspaceRadii.pill,
    backgroundColor: workspaceColors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...pollTypography.initials,
    color: pollColors.ink,
  },
  count: {
    ...pollTypography.count,
    color: pollColors.ink,
    marginLeft: 6,
  },
  countEmpty: {
    color: workspaceColors.muted,
  },
});
