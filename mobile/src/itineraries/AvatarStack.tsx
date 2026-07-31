import { StyleSheet, Text, View } from 'react-native';
import { initialsFor } from '../onboarding/initials';
import { colors, radii, spacing, typography } from '../theme';
import type { MemberResponse } from '../types/api';


const SHOWN = 4;


export function AvatarStack({ roster }: { roster: MemberResponse[] }) {
  const shown = roster.slice(0, SHOWN);
  const overflow = roster.length - shown.length;

  return (
    <View style={styles.stack}>
      {shown.map((member) => (
        <View key={member.travelerId} style={styles.bubble}>
          <Text style={styles.initials}>{initialsFor(member.displayName, null)}</Text>
        </View>
      ))}
      {overflow > 0 && (
        <View style={[styles.bubble, styles.overflow]}>
          <Text style={styles.initials}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

const BUBBLE = 32;

const styles = StyleSheet.create({
  stack: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  bubble: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflow: { backgroundColor: colors.surface },
  initials: { ...typography.caption, color: colors.textPrimary },
});
