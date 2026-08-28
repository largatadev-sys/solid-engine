import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { useReducedMotion } from '../components/useReducedMotion';
import type { PickedPhoto } from '../media/pickedPhoto';
import { MAX_REPORT_SCREENSHOTS } from '../repositories/reportRepository';
import { colors, radii, spacing } from '../theme';
import {
  feedbackColors,
  feedbackMetrics,
  feedbackMotion,
  feedbackTypography,
} from '../theme/workspaceTokens';
import {
  ADD_SCREENSHOT_LABEL,
  REMOVE_SCREENSHOT_LABEL,
  SCREENSHOTS_LABEL,
  screenshotsNote,
} from './feedbackCopy';


interface FeedbackScreenshotsProps {
  readonly picked: readonly PickedPhoto[];
  readonly atFault: boolean;
  readonly disabled: boolean;
  readonly onAdd: () => void;
  readonly onRemove: (uri: string) => void;
}


export function FeedbackScreenshots({
  picked,
  atFault,
  disabled,
  onAdd,
  onRemove,
}: FeedbackScreenshotsProps) {
  const full = picked.length >= MAX_REPORT_SCREENSHOTS;

  return (
    <View>
      <View style={styles.header}>
        <Text style={[styles.label, atFault && styles.atFault]}>{SCREENSHOTS_LABEL}</Text>
        <Text style={styles.note}>{screenshotsNote(picked.length, MAX_REPORT_SCREENSHOTS)}</Text>
      </View>

      <View style={styles.strip}>
        {picked.map((photo) => (
          <Tile
            key={photo.uri}
            photo={photo}
            atFault={atFault}
            disabled={disabled}
            onRemove={() => onRemove(photo.uri)}
          />
        ))}

        {!full && (
          <Pressable
            style={[styles.tile, styles.addTile]}
            onPress={onAdd}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={ADD_SCREENSHOT_LABEL}
          >
            <Icon name="plus" size={20} color={colors.textSecondary} />
            <Text style={styles.addLabel}>{ADD_SCREENSHOT_LABEL}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}


function Tile({
  photo,
  atFault,
  disabled,
  onRemove,
}: {
  readonly photo: PickedPhoto;
  readonly atFault: boolean;
  readonly disabled: boolean;
  readonly onRemove: () => void;
}) {
  const pop = useRef(new Animated.Value(feedbackMotion.tilePopFromScale)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    Animated.timing(pop, {
      toValue: 1,
      duration: reducedMotion ? 0 : feedbackMotion.tilePopMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [pop, reducedMotion]);

  return (
    <Animated.View
      style={[styles.tile, styles.filled, atFault && styles.tileAtFault, { transform: [{ scale: pop }] }]}
    >
      <Image source={{ uri: photo.uri }} style={styles.image} accessibilityIgnoresInvertColors />
      <Pressable
        style={styles.remove}
        onPress={onRemove}
        disabled={disabled}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={REMOVE_SCREENSHOT_LABEL}
      >
        <Icon name="close" size={feedbackMetrics.removeGlyph} color={colors.textOnAccent} />
      </Pressable>
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...feedbackTypography.fieldLabel,
    color: colors.textPrimary,
  },
  atFault: {
    color: colors.danger,
  },
  note: {
    ...feedbackTypography.note,
    color: colors.textSecondary,
  },
  strip: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    height: feedbackMetrics.tileHeight,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  tileAtFault: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  addTile: {
    backgroundColor: feedbackColors.addTileFill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: feedbackColors.addTileDash,
    gap: spacing.xs,
  },
  addLabel: {
    ...feedbackTypography.addTile,
    color: colors.textSecondary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  remove: {
    position: 'absolute',
    top: spacing.xs2,
    right: spacing.xs2,
    width: feedbackMetrics.removeDisc,
    height: feedbackMetrics.removeDisc,
    borderRadius: radii.pill,
    backgroundColor: feedbackColors.removeDisc,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
