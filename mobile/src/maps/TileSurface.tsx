import { useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewProps,
} from 'react-native';
import { openInMaps } from '../places/openInMaps';
import { mapColors, mapMetrics } from '../theme/workspaceTokens';
import { spacing } from '../theme';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  panned,
  screenOffsetOf,
  tilesCovering,
  type LatLng,
} from './tileProjection';
import { tileHref, tileKey, type MapConfig } from './tileUrl';
import { useMapGesture } from './useMapGesture';


export const ZOOM_IN_LABEL = 'Zoom in';

export const ZOOM_OUT_LABEL = 'Zoom out';


interface TileSurfaceProps {
  readonly config: MapConfig;
  readonly centre: LatLng;
  readonly zoom: number;
  readonly onMove: (centre: LatLng, zoom: number) => void;
  readonly pin?: LatLng | null;
  readonly children?: React.ReactNode;
}


export function TileSurface({ config, centre, zoom, onMove, pin, children }: TileSurfaceProps) {
  const surfaceRef = useRef<View | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);

  const viewport = { centre, zoom, width: size.width, height: size.height };
  const shifted = drag === null ? centre : panned(centre, zoom, drag.dx, drag.dy);
  const shownViewport = { ...viewport, centre: shifted };

  const gesture = useMapGesture({
    onPan: (dx, dy) => setDrag({ dx, dy }),
    onSettle: (dx, dy) => {
      setDrag(null);
      if (dx !== 0 || dy !== 0) onMove(panned(centre, zoom, dx, dy), zoom);
    },
    onZoom: (by) => onMove(centre, clampZoom(zoom + by)),
    surfaceRef,
    dragging: drag !== null,
  });

  const pinAt = pin == null ? null : screenOffsetOf(pin, shownViewport);

  return (
    <View
      style={styles.surface}
      onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout)}
    >
      <View
        ref={surfaceRef}
        {...(gesture.handlers as ViewProps)}
        style={StyleSheet.flatten([styles.field, gesture.surfaceStyle])}
      >
        {tilesCovering(shownViewport).map((tile) => (
          <Image
            key={tileKey(tile)}
            source={{ uri: tileHref(config.tileUrl, tile) }}
            style={[styles.tile, { left: tile.left, top: tile.top }]}
            accessibilityRole="none"
            accessible={false}
          />
        ))}
      </View>

      {pinAt === null ? null : (
        <View
          pointerEvents="none"
          style={[
            styles.pin,
            { left: pinAt.x - mapMetrics.pinWidth / 2, top: pinAt.y - mapMetrics.pinHeight },
          ]}
        >
          <View style={styles.pinHead} />
          <View style={styles.pinTip} />
        </View>
      )}

      {children}

      <View style={styles.controls} pointerEvents="box-none">
        <ZoomControl
          label={ZOOM_IN_LABEL}
          glyph="+"
          disabled={zoom >= MAX_ZOOM}
          onPress={() => onMove(centre, clampZoom(zoom + 1))}
        />
        <ZoomControl
          label={ZOOM_OUT_LABEL}
          glyph="−"
          disabled={zoom <= MIN_ZOOM}
          onPress={() => onMove(centre, clampZoom(zoom - 1))}
        />
      </View>

      <Pressable
        style={styles.attribution}
        accessibilityRole="link"
        accessibilityLabel={`${config.attribution}, opens the map licence`}
        onPress={() => openInMaps(config.attributionUrl)}
      >
        <Text style={styles.attributionText} numberOfLines={1}>
          {config.attribution}
        </Text>
      </Pressable>
    </View>
  );
}


function ZoomControl({
  label,
  glyph,
  disabled,
  onPress,
}: {
  readonly label: string;
  readonly glyph: string;
  readonly disabled: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={StyleSheet.flatten([styles.control, disabled && styles.controlSpent])}
    >
      <Text style={styles.controlGlyph}>{glyph}</Text>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  surface: { flex: 1, overflow: 'hidden', backgroundColor: mapColors.tileVoid },
  field: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  tile: { position: 'absolute', width: 256, height: 256 },
  pin: {
    position: 'absolute',
    width: mapMetrics.pinWidth,
    height: mapMetrics.pinHeight,
    alignItems: 'center',
  },
  pinHead: {
    width: mapMetrics.pinWidth,
    height: mapMetrics.pinWidth,
    borderRadius: mapMetrics.pinWidth,
    backgroundColor: mapColors.pinBody,
    borderWidth: 3,
    borderColor: mapColors.pinStroke,
  },
  pinTip: {
    width: 4,
    height: mapMetrics.pinHeight - mapMetrics.pinWidth,
    marginTop: -mapMetrics.pinTipInset,
    backgroundColor: mapColors.pinBody,
  },
  controls: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    gap: spacing.xs,
  },
  control: {
    width: mapMetrics.controlSize,
    height: mapMetrics.controlSize,
    borderRadius: mapMetrics.controlSize,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: mapColors.controlBacking,
  },
  controlSpent: { opacity: 0.4 },
  controlGlyph: { color: mapColors.controlInk, lineHeight: mapMetrics.controlSize },
  attribution: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    height: mapMetrics.attributionHeight,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    backgroundColor: mapColors.attributionBacking,
  },
  attributionText: { color: mapColors.attributionInk },
});
