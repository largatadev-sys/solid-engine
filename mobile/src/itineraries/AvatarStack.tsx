import { StyleSheet, Text, View } from 'react-native';
import { initialsFor } from '../onboarding/initials';
import { MediaThumb } from '../media/MediaThumb';
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
  return (
    <MediaThumb
      url={member.avatarUrl}
      style={styles.bubble}
      accessibilityLabel={`${member.displayName}'s profile photo`}
      fallback={<Text style={styles.initials}>{initialsFor(member.displayName, null)}</Text>}
    />
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
