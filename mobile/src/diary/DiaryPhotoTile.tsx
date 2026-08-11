import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { MediaThumb } from '../media/MediaThumb';
import {
  diaryColors,
  diaryMetrics,
  diaryTypography,
  workspaceColors,
} from '../theme/workspaceTokens';
import { spacing } from '../theme';

const REMOVE_ICON_SIZE = 11;
const ADD_ICON_SIZE = 18;

const THREE_ACROSS_WITH_GAPS = '31.5%';

export type PhotoSource = 'phone' | 'dump';

const BADGE: Record<PhotoSource, string> = {
  phone: 'PHONE',
  dump: 'DUMP',
};


interface DiaryPhotoTileProps {
  readonly url: string | null;
  readonly localPreview?: string | null;
  readonly accessibilityLabel: string;
  readonly source?: PhotoSource;
  readonly selected?: boolean;
  readonly onRemove?: () => void;
  readonly onPress?: () => void;
}


export function DiaryPhotoTile({
  url,
  localPreview = null,
  accessibilityLabel,
  source,
  selected = false,
  onRemove,
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
        fallback={<Icon name="camera" size={ADD_ICON_SIZE} color={workspaceColors.muted} />}
        fallbackStyle={styles.fallback}
      />

      {onRemove !== undefined ? (
        <Pressable
          style={styles.remove}
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${accessibilityLabel}`}
          hitSlop={8}
        >
          <Icon name="trash" size={REMOVE_ICON_SIZE} color={diaryColors.badgeText} />
        </Pressable>
      ) : selected ? (
        <View style={styles.check}>
          <Icon name="check" size={REMOVE_ICON_SIZE} color={diaryColors.badgeText} />
        </View>
      ) : null}

      {source !== undefined ? (
        <View style={[styles.badge, source === 'dump' && styles.badgeDump]}>
          <Text style={styles.badgeLabel}>{BADGE[source]}</Text>
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
  readonly emphasis?: 'plain' | 'dump';
}


export function DiaryAddTile({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
  emphasis = 'plain',
}: DiaryAddTileProps) {
  const isDump = emphasis === 'dump';

  return (
    <Pressable
      style={[styles.addTile, isDump ? styles.addTileDump : styles.addTilePlain, disabled && styles.addTileDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      <Icon
        name={isDump ? 'copy' : 'plus'}
        size={ADD_ICON_SIZE}
        color={isDump ? diaryColors.dumpLabel : diaryColors.addLabel}
      />
      <Text style={[styles.addLabel, isDump ? styles.addLabelDump : styles.addLabelPlain]}>
        {label}
      </Text>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  tile: {
    width: THREE_ACROSS_WITH_GAPS,
    aspectRatio: 1,
    borderRadius: diaryMetrics.tileRadius,
    overflow: 'hidden',
    backgroundColor: diaryColors.tileWell,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: diaryMetrics.tileRadius,
  },
  fallback: {
    backgroundColor: diaryColors.tileWell,
  },
  remove: {
    position: 'absolute',
    top: diaryMetrics.badgeInset,
    right: diaryMetrics.badgeInset,
    width: diaryMetrics.checkSize,
    height: diaryMetrics.checkSize,
    borderRadius: diaryMetrics.checkSize,
    backgroundColor: diaryColors.check,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    position: 'absolute',
    top: diaryMetrics.badgeInset,
    right: diaryMetrics.badgeInset,
    width: diaryMetrics.checkSize,
    height: diaryMetrics.checkSize,
    borderRadius: diaryMetrics.checkSize,
    backgroundColor: diaryColors.check,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: diaryMetrics.badgeInset,
    left: diaryMetrics.badgeInset,
    paddingHorizontal: spacing.xs2,
    paddingVertical: spacing.hair,
    borderRadius: 999,
    backgroundColor: diaryColors.badgeInk,
  },
  badgeDump: {
    backgroundColor: diaryColors.check,
  },
  badgeLabel: {
    ...diaryTypography.sourceBadge,
    color: diaryColors.badgeText,
  },
  addTile: {
    flex: 1,
    borderRadius: diaryMetrics.tileRadius,
    paddingVertical: spacing.sm3,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addTilePlain: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: diaryColors.tileDash,
  },
  addTileDump: {
    backgroundColor: diaryColors.dumpWell,
    borderWidth: 1,
    borderColor: diaryColors.dumpBorder,
  },
  addTileDisabled: {
    opacity: 0.5,
  },
  addLabel: {
    textAlign: 'center',
  },
  addLabelPlain: {
    ...diaryTypography.addTile,
    color: diaryColors.addLabel,
  },
  addLabelDump: {
    ...diaryTypography.dumpTile,
    color: diaryColors.dumpLabel,
  },
});
