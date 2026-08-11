import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { MediaThumb } from '../media/MediaThumb';
import {
  diaryColors,
  diaryMetrics,
  diaryTypography,
  workspaceColors,
} from '../theme/workspaceTokens';
import { radii, spacing } from '../theme';

export const DIARY_TILE_SIZE = diaryMetrics.tileSize;


interface DiaryPhotoTileProps {
  readonly url: string | null;
  readonly localPreview?: string | null;
  readonly accessibilityLabel: string;
  readonly selected: boolean;
  readonly onPress?: () => void;
}


export function DiaryPhotoTile({
  url,
  localPreview = null,
  accessibilityLabel,
  selected,
  onPress,
}: DiaryPhotoTileProps) {
  return (
    <Pressable
      style={styles.tile}
      onPress={onPress}
      disabled={onPress === undefined}
      accessibilityRole={onPress === undefined ? undefined : 'checkbox'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel}
    >
      <MediaThumb
        url={url}
        localPreview={localPreview}
        style={styles.image}
        accessibilityLabel={accessibilityLabel}
        fallback={<Icon name="camera" size={20} color={workspaceColors.muted} />}
        fallbackStyle={styles.fallback}
      />
      {selected ? (
        <View style={styles.check}>
          <Icon name="check" size={12} color={workspaceColors.onAccent} />
        </View>
      ) : null}
    </Pressable>
  );
}


interface DiaryAddTileProps {
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
}


export function DiaryAddTile({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
}: DiaryAddTileProps) {
  return (
    <Pressable
      style={[styles.addTile, disabled && styles.addTileDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      <Icon name="plus" size={20} color={workspaceColors.muted} />
      <Text style={styles.addLabel}>{label}</Text>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  tile: {
    width: DIARY_TILE_SIZE,
    height: DIARY_TILE_SIZE,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: diaryColors.tileWell,
  },
  image: {
    width: DIARY_TILE_SIZE,
    height: DIARY_TILE_SIZE,
    borderRadius: radii.md,
  },
  fallback: {
    backgroundColor: diaryColors.tileWell,
  },
  check: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: diaryMetrics.checkSize,
    height: diaryMetrics.checkSize,
    borderRadius: radii.pill,
    backgroundColor: diaryColors.check,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: DIARY_TILE_SIZE,
    height: DIARY_TILE_SIZE,
    borderRadius: radii.md,
    backgroundColor: diaryColors.tileWell,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: diaryColors.tileDash,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs2,
  },
  addTileDisabled: {
    opacity: 0.5,
  },
  addLabel: {
    ...diaryTypography.tileLabel,
    color: workspaceColors.muted,
  },
});
