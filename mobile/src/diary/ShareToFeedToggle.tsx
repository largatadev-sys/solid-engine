import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { SHARE_TO_FEED_HINT, SHARE_TO_FEED_LABEL } from './diaryCopy';
import { diaryColors, diaryTypography, workspaceColors } from '../theme/workspaceTokens';
import { radii, spacing } from '../theme';

const GLOBE_SIZE = 18;
const CHECK_SIZE = 14;
const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 26;
const KNOB = 22;


type Props = {
  readonly on: boolean;
  readonly onChange: (on: boolean) => void;
};


export function ShareToFeedToggle({ on, onChange }: Props) {
  return (
    <Pressable
      style={[styles.row, on && styles.rowOn]}
      onPress={() => onChange(!on)}
      accessibilityRole="switch"
      accessibilityLabel={SHARE_TO_FEED_LABEL}
      accessibilityState={{ checked: on }}
    >
      <Icon name="globe" size={GLOBE_SIZE} color={on ? diaryColors.eyebrow : workspaceColors.muted} />
      <View style={styles.labels}>
        <Text style={[styles.label, on && styles.labelOn]}>{SHARE_TO_FEED_LABEL}</Text>
        <Text style={styles.hint}>{SHARE_TO_FEED_HINT}</Text>
      </View>
      <View style={[styles.track, on && styles.trackOn]}>
        <View style={[styles.knob, on && styles.knobOn]}>
          {on ? <Icon name="check" size={CHECK_SIZE} color={diaryColors.eyebrow} /> : null}
        </View>
      </View>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    paddingVertical: spacing.sm3,
    paddingHorizontal: spacing.sm3,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: diaryColors.fieldBorder,
    backgroundColor: workspaceColors.surface,
  },
  rowOn: {
    borderColor: diaryColors.dumpBorder,
    backgroundColor: diaryColors.dumpWell,
  },
  labels: {
    flex: 1,
    gap: spacing.hair,
  },
  label: {
    ...diaryTypography.sectionLabel,
    color: diaryColors.sectionLabel,
  },
  labelOn: {
    color: diaryColors.dumpLabel,
  },
  hint: {
    ...diaryTypography.note,
    color: workspaceColors.muted,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: radii.pill,
    backgroundColor: workspaceColors.hairline,
    padding: 2,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: diaryColors.eyebrow,
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: radii.pill,
    backgroundColor: workspaceColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobOn: {
    alignSelf: 'flex-end',
  },
});
