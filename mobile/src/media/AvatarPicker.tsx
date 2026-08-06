import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { colors, radii, spacing, typography } from '../theme';

export const UPLOAD_PHOTO_LABEL = 'Upload Photo';
export const REMOVE_PHOTO_LABEL = 'Remove Photo';

interface AvatarPickerProps {
  readonly photoUrl: string | null;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly busy: boolean;
  readonly onPick: () => void;
  readonly onRemove: () => void;
}


export function AvatarPicker({
  photoUrl,
  displayName,
  email,
  busy,
  onPick,
  onRemove,
}: AvatarPickerProps) {
  const hasPhoto = photoUrl !== null && photoUrl !== '';

  return (
    <View style={styles.block}>
      <Pressable
        onPress={onPick}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={UPLOAD_PHOTO_LABEL}
        style={styles.avatarWell}
      >
        <Avatar photoUrl={photoUrl} displayName={displayName} email={email} />
        <View style={styles.badge}>
          <Icon name="camera" size={BADGE_ICON} color={colors.textOnAccent} />
        </View>
      </Pressable>

      <Pressable onPress={onPick} disabled={busy} accessibilityRole="button">
        <Text style={styles.upload}>{busy ? 'Uploading…' : UPLOAD_PHOTO_LABEL}</Text>
      </Pressable>

      {hasPhoto && !busy ? (
        <Pressable onPress={onRemove} accessibilityRole="button">
          <Text style={styles.remove}>{REMOVE_PHOTO_LABEL}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const BADGE = 40;
const BADGE_ICON = 20;

const styles = StyleSheet.create({
  block: { alignItems: 'center', gap: spacing.md },
  avatarWell: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    width: BADGE,
    height: BADGE,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upload: { ...typography.label, color: colors.textPrimary },
  remove: { ...typography.label, color: colors.textSecondary },
});
