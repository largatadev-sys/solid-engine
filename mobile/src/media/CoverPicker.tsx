import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMediaSource } from './useMediaSource';
import { colors, radii, spacing, typography } from '../theme';

export const UPLOAD_COVER_LABEL = 'Upload photo(s)';
export const REPLACE_COVER_LABEL = 'Replace photo';
export const REMOVE_COVER_LABEL = 'Remove photo';

interface CoverPickerProps {
  readonly coverUrl: string | null;
  readonly busy: boolean;
  readonly onPick: () => void;
  readonly onRemove: () => void;
}


export function CoverPicker({ coverUrl, busy, onPick, onRemove }: CoverPickerProps) {
  const source = useMediaSource(coverUrl);

  if (source !== null) {
    return (
      <View style={styles.filled}>
        <Image
          source={source}
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel="Trip cover photo"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.actions}>
          <Pressable onPress={onPick} disabled={busy} accessibilityRole="button">
            <Text style={styles.action}>{busy ? 'Uploading…' : REPLACE_COVER_LABEL}</Text>
          </Pressable>
          <Pressable onPress={onRemove} disabled={busy} accessibilityRole="button">
            <Text style={styles.remove}>{REMOVE_COVER_LABEL}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      style={styles.dropZone}
      onPress={onPick}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={UPLOAD_COVER_LABEL}
    >
      <View style={styles.pill}>
        <Text style={styles.pillLabel}>{busy ? 'Uploading…' : UPLOAD_COVER_LABEL}</Text>
      </View>
    </Pressable>
  );
}

const DROP_ZONE_HEIGHT = 150;

const styles = StyleSheet.create({
  dropZone: {
    height: DROP_ZONE_HEIGHT,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    backgroundColor: colors.accent,
    borderRadius: radii.control,
    paddingVertical: spacing.sm2,
    paddingHorizontal: spacing.md,
  },
  pillLabel: { ...typography.fieldAction, color: colors.textOnAccent },
  filled: { gap: spacing.sm },
  image: {
    height: DROP_ZONE_HEIGHT,
    width: '100%',
    borderRadius: radii.control,
    backgroundColor: colors.surfaceMuted,
  },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { ...typography.label, color: colors.accent },
  remove: { ...typography.label, color: colors.textSecondary },
});
