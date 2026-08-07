import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Cropper from 'react-easy-crop';
import { colors, radii, spacing, typography } from '../theme';
import type { CropArea } from './cropToSquare.web';

export const CROP_TITLE = 'Position your photo';
export const CROP_HINT = 'Drag to move, pinch or scroll to zoom.';
export const CROP_CONFIRM = 'Use photo';
export const CROP_CANCEL = 'Cancel';

interface CircularCropperProps {
  readonly source: string | null;
  readonly onCancel: () => void;
  readonly onConfirm: (area: CropArea) => void;
}


export function CircularCropper({ source, onCancel, onConfirm }: CircularCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropArea | null>(null);

  return (
    <Modal visible={source !== null} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{CROP_TITLE}</Text>

          <View style={styles.stage}>
            {source !== null && (
              <Cropper
                image={source}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_area, pixels) => setArea(pixels)}
              />
            )}
          </View>

          <Text style={styles.hint}>{CROP_HINT}</Text>

          <View style={styles.actions}>
            <Pressable onPress={onCancel} accessibilityRole="button" style={styles.secondary}>
              <Text style={styles.secondaryLabel}>{CROP_CANCEL}</Text>
            </Pressable>
            <Pressable
              onPress={() => area !== null && onConfirm(area)}
              accessibilityRole="button"
              accessibilityLabel={CROP_CONFIRM}
              style={styles.primary}
            >
              <Text style={styles.primaryLabel}>{CROP_CONFIRM}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const STAGE_HEIGHT = 320;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { ...typography.heading, color: colors.textPrimary, textAlign: 'center' },
  stage: {
    height: STAGE_HEIGHT,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.textPrimary,
    position: 'relative',
  },
  hint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  secondary: {
    flex: 1,
    height: 51,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { ...typography.action, color: colors.textPrimary },
  primary: {
    flex: 1,
    height: 51,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { ...typography.action, color: colors.textOnAccent },
});
