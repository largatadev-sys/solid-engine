import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { PollVoterCluster } from './PollVoterCluster';
import type { OptionMarker, OptionState } from './pollBoard';
import {
  pollColors,
  pollMetrics,
  pollTypography,
  workspaceColors,
  workspaceRadii,
} from '../theme/workspaceTokens';
import type { PollOptionResponse } from '../types/api';


interface PollOptionRowProps {
  readonly option: PollOptionResponse;
  readonly state: OptionState;
  readonly marker: OptionMarker;
  readonly onPress: (() => void) | undefined;
}


export function PollOptionRow({ option, state, marker, onPress }: PollOptionRowProps) {
  return (
    <Pressable
      style={[styles.row, rowStyles[state], marker === 'star' && styles.winner]}
      onPress={onPress}
      disabled={onPress === undefined}
      accessibilityRole={marker === 'none' || marker === 'star' ? 'text' : 'radio'}
      accessibilityState={{ checked: state === 'recorded' || state === 'demoted' }}
      accessibilityLabel={`${option.label}, ${option.voteCount} votes`}
    >
      <Marker marker={marker} />

      <View style={styles.labelBlock}>
        <Text style={styles.label}>{option.label}</Text>
        <PollVoterCluster voters={option.voters} voteCount={option.voteCount} />
      </View>
    </Pressable>
  );
}


function Marker({ marker }: { marker: OptionMarker }) {
  if (marker === 'none') {
    return null;
  }
  if (marker === 'star') {
    return (
      <View style={styles.marker}>
        <Icon name="starFilled" size={16} color={workspaceColors.accent} />
      </View>
    );
  }
  if (marker === 'check') {
    return (
      <View style={styles.marker}>
        <Icon name="checkCircleFilled" size={18} color={workspaceColors.accent} />
      </View>
    );
  }
  if (marker === 'demotedCheck') {
    return (
      <View style={styles.marker}>
        <Icon name="checkCircle" size={16} color={pollColors.demoted} />
      </View>
    );
  }
  if (marker === 'selected') {
    return (
      <View style={styles.marker}>
        <View style={styles.radioRinged} />
      </View>
    );
  }
  return (
    <View style={styles.marker}>
      <View style={styles.radio} />
    </View>
  );
}


const RADIO = 18;

const RING_BAND = 6;


const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: pollMetrics.optionRadius,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    backgroundColor: workspaceColors.surface,
  },
  winner: {
    backgroundColor: pollColors.winnerPaper,
  },
  marker: {
    width: RADIO,
    height: RADIO,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radio: {
    width: RADIO,
    height: RADIO,
    borderRadius: workspaceRadii.pill,
    borderWidth: 1.5,
    borderColor: workspaceColors.hairline,
  },
  radioRinged: {
    width: RADIO,
    height: RADIO,
    borderRadius: workspaceRadii.pill,
    borderWidth: RING_BAND,
    borderColor: workspaceColors.accent,
    backgroundColor: workspaceColors.surface,
  },
  labelBlock: {
    flex: 1,
    gap: 6,
  },
  label: {
    ...pollTypography.optionLabel,
    color: workspaceColors.title,
  },
});


const rowStyles = StyleSheet.create({
  idle: {},
  selected: {
    backgroundColor: pollColors.selectedFill,
    borderColor: workspaceColors.accent,
    borderWidth: 1.5,
  },
  recorded: {
    backgroundColor: pollColors.recordedFill,
    borderColor: workspaceColors.accent,
    borderWidth: 1.5,
  },
  demoted: {},
});
