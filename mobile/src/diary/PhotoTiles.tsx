import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { MediaThumb } from '../media/MediaThumb';
import type { PickedPhoto } from '../media/pickedPhoto';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';
import { DAY_ADD_PHOTO } from './memoryCopy';
import { MemoryIcon } from './MemoryIcon';


interface PhotoTilesProps {
  readonly photos: readonly PickedPhoto[];
  readonly limit: number;
  readonly addLabel: string;
  readonly onAdd: () => void;
  readonly onRemove: (index: number) => void;
}


export function PhotoTiles({ photos, limit, addLabel, onAdd, onRemove }: PhotoTilesProps) {
  const [width, setWidth] = useState(0);
  const full = photos.length >= limit;
  const side = tileSideFor(width);

  return (
    <View
      style={styles.grid}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {side > 0 &&
        photos.map((photo, index) => (
          <Tile
            key={photo.uri}
            photo={photo}
            index={index}
            side={side}
            onRemove={() => onRemove(index)}
          />
        ))}

      {side > 0 && !full && (
        <Pressable
          style={({ pressed }) =>
            StyleSheet.flatten([
              styles.add,
              { width: side, height: side },
              pressed ? styles.pressed : null,
            ])
          }
          accessibilityRole="button"
          accessibilityLabel={addLabel}
          onPress={onAdd}
        >
          <MemoryIcon name="plus" size={20} color={memoryColors.muted} strokeWidth={2} />
          <Text style={styles.addInk}>{DAY_ADD_PHOTO}</Text>
        </Pressable>
      )}
    </View>
  );
}


export function tileSideFor(gridWidth: number): number {
  if (gridWidth <= 0) return 0;
  const gaps = memoryMetrics.tileGap * (memoryMetrics.tileColumns - 1);
  return Math.floor((gridWidth - gaps) / memoryMetrics.tileColumns);
}


export function SelectedCheck({ pop }: { readonly pop: Animated.Value }) {
  return (
    <Animated.View style={[styles.check, { transform: [{ scale: pop }] }]}>
      <MemoryIcon name="check" size={11} color={memoryColors.white} strokeWidth={2.5} />
    </Animated.View>
  );
}


export function useTileEntrance(): { enter: Animated.Value; pop: Animated.Value } {
  const pop = useRef(new Animated.Value(0.5)).current;
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(enter, {
        toValue: 1,
        duration: memoryMotion.rowEnterMs,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(pop, {
        toValue: 1,
        duration: memoryMotion.checkPopMs,
        easing: Easing.bezier(...memoryMotion.checkPopBezier),
        useNativeDriver: true,
      }),
    ]).start();
  }, [enter, pop]);

  return { enter, pop };
}


function Tile({
  photo,
  index,
  side,
  onRemove,
}: {
  readonly photo: PickedPhoto;
  readonly index: number;
  readonly side: number;
  readonly onRemove: () => void;
}) {
  const { enter, pop } = useTileEntrance();

  return (
    <Animated.View
      style={{
        width: side,
        height: side,
        opacity: enter,
        transform: [
          {
            scale: enter.interpolate({
              inputRange: [0, 1],
              outputRange: [memoryMotion.rowEnterScale, 1],
            }),
          },
        ],
      }}
    >
      <Pressable
        style={({ pressed }) =>
          StyleSheet.flatten([styles.tile, pressed ? styles.tilePressed : null])
        }
        accessibilityRole="button"
        accessibilityLabel={`Remove photo ${index + 1}`}
        onPress={onRemove}
      >
        <MediaThumb
          url={null}
          localPreview={photo.uri}
          style={styles.photo}
          accessibilityLabel={`Photo ${index + 1}`}
        />
        <SelectedCheck pop={pop} />
      </Pressable>
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: memoryMetrics.tileGap,
  },
  tile: {
    flex: 1,
    borderRadius: memoryMetrics.tileRadius,
    overflow: 'hidden',
    backgroundColor: memoryColors.wellDivider,
  },
  tilePressed: {
    transform: [{ scale: memoryMotion.tilePressScale }],
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: memoryMetrics.checkSize,
    height: memoryMetrics.checkSize,
    borderRadius: memoryMetrics.checkSize / 2,
    backgroundColor: memoryColors.check,
    borderWidth: memoryMetrics.checkBorder,
    borderColor: memoryColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    borderRadius: memoryMetrics.tileRadius,
    borderWidth: memoryMetrics.dashedWidth,
    borderStyle: 'dashed',
    borderColor: memoryColors.dashed,
    backgroundColor: memoryColors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addInk: {
    ...memoryTypography.addTile,
    color: memoryColors.muted,
  },
  pressed: {
    opacity: memoryMotion.pressOpacity,
  },
});
