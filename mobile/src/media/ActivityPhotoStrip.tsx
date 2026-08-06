import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMediaSource } from './useMediaSource';
import { colors, radii, spacing, typography } from '../theme';
import type { ActivityPhotoResponse } from '../types/api';

export const ADD_PHOTO_LABEL = '+ Add Photo';
export const MAX_PHOTOS_PER_ACTIVITY = 5;

interface ActivityPhotoStripProps {
  readonly photos: readonly ActivityPhotoResponse[];
  readonly busy: boolean;
  readonly onAdd: () => void;
  readonly onRemove: (photoId: string) => void;
}


export function ActivityPhotoStrip({ photos, busy, onAdd, onRemove }: ActivityPhotoStripProps) {
  const full = photos.length >= MAX_PHOTOS_PER_ACTIVITY;

  return (
    <View style={styles.strip}>
      {photos.map((photo) => (
        <Thumbnail key={photo.id} photo={photo} onRemove={() => onRemove(photo.id)} disabled={busy} />
      ))}

      {!full && (
        <Pressable
          style={styles.addTile}
          onPress={onAdd}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={ADD_PHOTO_LABEL}
        >
          <Text style={styles.addLabel}>{busy ? '…' : ADD_PHOTO_LABEL}</Text>
        </Pressable>
      )}
    </View>
  );
}


function Thumbnail({
  photo,
  onRemove,
  disabled,
}: {
  photo: ActivityPhotoResponse;
  onRemove: () => void;
  disabled: boolean;
}) {
  const source = useMediaSource(photo.thumbUrl);

  return (
    <Pressable
      onPress={onRemove}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Remove this photo"
      style={styles.thumbnail}
    >
      {source !== null && (
        <Image
          source={source}
          style={styles.thumbnailImage}
          accessibilityIgnoresInvertColors
        />
      )}
    </Pressable>
  );
}

const TILE = 80;

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  addTile: {
    width: TILE,
    height: TILE,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  thumbnail: {
    width: TILE,
    height: TILE,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  thumbnailImage: { width: '100%', height: '100%' },
});
