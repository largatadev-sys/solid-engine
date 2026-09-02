import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { mapsUrl } from '../places/mapsQuery';
import { openInMaps } from '../places/openInMaps';
import { spacing } from '../theme';
import { mapColors, mapMetrics, workspaceColors, workspaceRadii } from '../theme/workspaceTokens';
import { useMapConfig } from '../query/placeQueries';
import { TileSurface } from './TileSurface';
import { MAP_UNAVAILABLE, OPEN_IN_MAPS, viewerLabel } from './mapCopy';
import type { LatLng } from './tileProjection';


interface MapViewerScreenProps {
  readonly place: string;
  readonly pin: LatLng;
  readonly zoom: number;
  readonly destination: string | null;
  readonly onClose: () => void;
}


export function MapViewerScreen({ place, pin, zoom, destination, onClose }: MapViewerScreenProps) {
  const config = useMapConfig();
  const [view, setView] = useState({ centre: pin, zoom });

  const handoff = mapsUrl(place, destination);

  return (
    <View style={styles.screen} accessibilityLabel={viewerLabel(place)}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onClose}
          style={styles.back}
        >
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {place}
        </Text>
      </View>

      <View style={styles.stage}>
        {config.data === undefined ? (
          <View style={styles.waiting}>
            {config.isError ? (
              <Text style={styles.unavailable}>{MAP_UNAVAILABLE}</Text>
            ) : (
              <ActivityIndicator color={workspaceColors.accent} />
            )}
          </View>
        ) : (
          <TileSurface
            config={config.data}
            centre={view.centre}
            zoom={view.zoom}
            pin={pin}
            onMove={(centre, movedTo) => setView({ centre, zoom: movedTo })}
          />
        )}
      </View>

      {handoff === undefined ? null : (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={OPEN_IN_MAPS}
          onPress={() => openInMaps(handoff)}
          style={styles.handoff}
        >
          <Text style={styles.handoffText}>{OPEN_IN_MAPS}</Text>
        </Pressable>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: workspaceColors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  back: { width: mapMetrics.controlSize, height: mapMetrics.controlSize, justifyContent: 'center' },
  backGlyph: { color: workspaceColors.title, lineHeight: mapMetrics.controlSize },
  title: { flex: 1, color: workspaceColors.title },
  stage: { flex: 1 },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  unavailable: { color: workspaceColors.muted, paddingHorizontal: spacing.lg, textAlign: 'center' },
  handoff: {
    margin: spacing.md,
    height: mapMetrics.searchBoxHeight,
    borderRadius: workspaceRadii.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: workspaceColors.accent,
  },
  handoffText: { color: mapColors.pinStroke },
});
