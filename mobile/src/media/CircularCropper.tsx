import { useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import {
  clampOffset,
  clampZoom,
  coverScale,
  cropAreaOf,
  distanceBetween,
  zoomForPinch,
  type CropArea,
  type Offset,
  type Size,
} from './cropGeometry';
import { colors, radii, spacing, typography } from '../theme';

export const CROP_TITLE = 'Position your photo';
export const CROP_HINT = 'Drag to move it. Pinch or use the buttons to zoom.';
export const CROP_CONFIRM = 'Use photo';
export const CROP_CANCEL = 'Cancel';
export const ZOOM_IN = 'Zoom in';
export const ZOOM_OUT = 'Zoom out';

export const FRAME = 260;

const ZOOM_STEP = 0.25;

interface CircularCropperProps {
  readonly source: string | null;
  readonly imageSize: Size | null;
  readonly onCancel: () => void;
  readonly onConfirm: (area: CropArea) => void;
}


export function CircularCropper({
  source,
  imageSize,
  onCancel,
  onConfirm,
}: CircularCropperProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const start = useRef<Offset>({ x: 0, y: 0 });
  const dragBase = useRef<Offset>({ x: 0, y: 0 });
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);

  const size = imageSize ?? { width: FRAME, height: FRAME };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          start.current = offset;
          dragBase.current = { x: 0, y: 0 };
          pinch.current = null;
        },
        onPanResponderMove: (event: GestureResponderEvent, gesture: PanResponderGestureState) => {
          const touches = event.nativeEvent.touches ?? [];
          if (touches.length >= 2) {
            const first = touches[0];
            const second = touches[1];
            if (first === undefined || second === undefined) return;
            const distance = distanceBetween(
              { x: first.pageX, y: first.pageY },
              { x: second.pageX, y: second.pageY },
            );
            if (pinch.current === null) pinch.current = { distance, zoom };
            const next = zoomForPinch(pinch.current.zoom, pinch.current.distance, distance);
            const held = clampOffset(offset, size, FRAME, next);
            setZoom(next);
            setOffset(held);
            start.current = held;
            dragBase.current = { x: gesture.dx, y: gesture.dy };
            return;
          }
          pinch.current = null;
          setOffset(
            clampOffset(
              {
                x: start.current.x + gesture.dx - dragBase.current.x,
                y: start.current.y + gesture.dy - dragBase.current.y,
              },
              size,
              FRAME,
              zoom,
            ),
          );
        },
      }),
    [offset, size, zoom],
  );

  const changeZoom = (by: number) => {
    const next = clampZoom(zoom + by);
    setZoom(next);
    setOffset((current) => clampOffset(current, size, FRAME, next));
  };

  const scale = coverScale(size, FRAME) * zoom;

  return (
    <Modal visible={source !== null} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{CROP_TITLE}</Text>

          <View style={styles.stage} {...pan.panHandlers}>
            {source !== null && (
              <Image
                source={{ uri: source }}
                style={{
                  width: size.width * scale,
                  height: size.height * scale,
                  transform: [{ translateX: offset.x }, { translateY: offset.y }],
                }}
                accessibilityIgnoresInvertColors
              />
            )}
            <View pointerEvents="none" style={styles.mask}>
              <View style={styles.hole} />
            </View>
          </View>

          <View style={styles.zoomRow}>
            <Pressable
              onPress={() => changeZoom(-ZOOM_STEP)}
              accessibilityRole="button"
              accessibilityLabel={ZOOM_OUT}
              style={styles.zoomButton}
            >
              <Text style={styles.zoomLabel}>−</Text>
            </Pressable>
            <Pressable
              onPress={() => changeZoom(ZOOM_STEP)}
              accessibilityRole="button"
              accessibilityLabel={ZOOM_IN}
              style={styles.zoomButton}
            >
              <Text style={styles.zoomLabel}>+</Text>
            </Pressable>
          </View>

          <Text style={styles.hint}>{CROP_HINT}</Text>

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={CROP_CANCEL}
              style={styles.secondary}
            >
              <Text style={styles.secondaryLabel}>{CROP_CANCEL}</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(cropAreaOf(size, FRAME, zoom, offset))}
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

const CONTROL_HEIGHT = 51;

const RING_WIDTH = 2;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { ...typography.heading, color: colors.textPrimary, textAlign: 'center' },
  stage: {
    width: FRAME + RING_WIDTH * 2,
    height: FRAME + RING_WIDTH * 2,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.textPrimary,
    borderRadius: radii.sm,
  },
  mask: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hole: {
    width: FRAME,
    height: FRAME,
    borderRadius: radii.pill,
    borderWidth: RING_WIDTH,
    borderColor: colors.surface,
  },
  zoomRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  zoomButton: {
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomLabel: { ...typography.heading, color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  secondary: {
    flex: 1,
    height: CONTROL_HEIGHT,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { ...typography.action, color: colors.textPrimary },
  primary: {
    flex: 1,
    height: CONTROL_HEIGHT,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { ...typography.action, color: colors.textOnAccent },
});
