import { Image, StyleSheet, Text, View } from 'react-native';
import { initialsFor } from '../onboarding/initials';
import { useMediaSource } from '../media/useMediaSource';
import { colors, radii, spacing, typography } from '../theme';
import type { MemberResponse } from '../types/api';


const SHOWN = 4;


export function AvatarStack({ roster }: { roster: MemberResponse[] }) {
  const shown = roster.slice(0, SHOWN);
  const overflow = roster.length - shown.length;

  return (
    <View style={styles.stack}>
      {shown.map((member) => (
        <MemberBubble key={member.travelerId} member={member} />
      ))}
      {overflow > 0 && (
        <View style={[styles.bubble, styles.overflow]}>
          <Text style={styles.initials}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

function MemberBubble({ member }: { member: MemberResponse }) {
  const source = useMediaSource(member.avatarUrl);

  if (source !== null) {
    return (
      <Image
        source={source}
        style={styles.bubble}
        accessibilityLabel={`${member.displayName}'s profile photo`}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View style={styles.bubble}>
      <Text style={styles.initials}>{initialsFor(member.displayName, null)}</Text>
    </View>
  );
}

const BUBBLE = 32;

const OVERLAP = -8;

const RING = 2;

const styles = StyleSheet.create({
  stack: { flexDirection: 'row', alignItems: 'center', paddingLeft: -OVERLAP },
  bubble: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: radii.pill,
    marginLeft: OVERLAP,
    borderWidth: RING,
    borderColor: colors.surface,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflow: { backgroundColor: colors.border },
  initials: { ...typography.fine, color: colors.textPrimary },
});
