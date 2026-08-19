import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { PollVoterCluster } from './PollVoterCluster';
import { PopIn } from './PopIn';
import type { OptionMarker, OptionState } from './pollBoard';
import {
  pollColors,
  pollMetrics,
  pollMotion,
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
  const emphasis = useRef(new Animated.Value(state === 'idle' || state === 'demoted' ? 0 : 1)).current;
  const lit = state === 'selected' || state === 'recorded';

  useEffect(() => {
    Animated.timing(emphasis, {
      toValue: lit ? 1 : 0,
      duration: pollMotion.rowSelectMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [emphasis, lit]);

  const backgroundColor = emphasis.interpolate({
    inputRange: [0, 1],
    outputRange: [
      marker === 'star' ? pollColors.winnerPaper : workspaceColors.surface,
      state === 'recorded' ? pollColors.recordedFill : pollColors.selectedFill,
    ],
  });
  const borderColor = emphasis.interpolate({
    inputRange: [0, 1],
    outputRange: [workspaceColors.hairline, workspaceColors.accent],
  });

  return (
    <AnimatedPressable
      style={[styles.row, lit && styles.rowLit, { backgroundColor, borderColor }]}
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
    </AnimatedPressable>
  );
}


function Marker({ marker }: { marker: OptionMarker }) {
  if (marker === 'none') {
    return null;
  }
  if (marker === 'star') {
    return (
      <PopIn key="star" style={styles.marker}>
        <Icon name="starFilled" size={16} color={workspaceColors.accent} />
      </PopIn>
    );
  }
  if (marker === 'check') {
    return (
      <PopIn key="check" style={styles.marker}>
        <Icon name="checkCircleFilled" size={18} color={workspaceColors.accent} />
      </PopIn>
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
      <PopIn key="ring" style={styles.marker}>
        <View style={styles.radioRinged} />
      </PopIn>
    );
  }
  return (
    <View style={styles.marker}>
      <View style={styles.radio} />
    </View>
  );
}


const AnimatedPressable = Animated.createAnimatedComponent(Pressable);


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
  },
  rowLit: {
    borderWidth: 1.5,
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
