import { useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { dragToScroll } from '../components/stripScroll';
import { MediaThumb } from '../media/MediaThumb';
import { pickPhotos } from '../media/pickPhoto';
import type { PickedPhoto } from '../media/pickedPhoto';
import { memoryRepository } from '../repositories/memoryRepository';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';
import { MemoryCta } from './MemoryCta';
import { MemoryField } from './MemoryField';
import { MemoryHeader } from './MemoryHeader';
import { MemoryIcon } from './MemoryIcon';
import { showMemoryToast } from './MemoryToast';
import {
  DAY_ADD_PHOTO,
  NEW_POSTCARD_TITLE,
  POSTCARD_CAPTION_LABEL,
  POSTCARD_PLACE_LABEL,
  POSTCARD_POST_FAILED,
  POST_CTA,
  DAY_PLACE_PLACEHOLDER,
} from './memoryCopy';
import { SelectedCheck, useTileEntrance } from './PhotoTiles';


interface NewPostcardScreenProps {
  readonly onPosted: () => void;
}


export function NewPostcardScreen({ onPosted }: NewPostcardScreenProps) {
  const [drag] = useState(() => dragToScroll(() => memoryMetrics.stripPhoto + memoryMetrics.tileGap));
  const [photos, setPhotos] = useState<readonly PickedPhoto[]>([]);
  const [caption, setCaption] = useState('');
  const [place, setPlace] = useState('');
  const [posting, setPosting] = useState(false);

  const ready = photos.length > 0 && (caption.trim() !== '' || place.trim() !== '');
  const full = photos.length >= memoryMetrics.photosPerPostcard;

  async function post(): Promise<void> {
    setPosting(true);
    try {
      await memoryRepository.postLoosePostcard(
        {
          caption: caption.trim() === '' ? null : caption.trim(),
          place: place.trim() === '' ? null : place.trim(),
        },
        photos,
      );
      onPosted();
    } catch {
      showMemoryToast(POSTCARD_POST_FAILED, 'failure');
      setPosting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <MemoryHeader pill="POSTCARD" title={NEW_POSTCARD_TITLE} />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.stripBleed}
          contentContainerStyle={styles.strip}
          {...drag}
        >
          {photos.map((photo, index) => (
            <StripTile
              key={photo.uri}
              photo={photo}
              index={index}
              onRemove={() => setPhotos(photos.filter((_, at) => at !== index))}
            />
          ))}

          {!full && (
            <Pressable
              style={({ pressed }) =>
                StyleSheet.flatten([styles.tile, styles.add, pressed ? styles.pressed : null])
              }
              accessibilityRole="button"
              accessibilityLabel={DAY_ADD_PHOTO}
              onPress={() => {
                void pickPhotos(memoryMetrics.photosPerPostcard - photos.length).then((picked) => {
                  if (picked.length > 0) {
                    setPhotos([...photos, ...picked].slice(0, memoryMetrics.photosPerPostcard));
                  }
                });
              }}
            >
              <MemoryIcon name="plus" size={20} color={memoryColors.muted} strokeWidth={2} />
              <Text style={styles.addInk}>{DAY_ADD_PHOTO}</Text>
            </Pressable>
          )}
        </ScrollView>

        <MemoryField
          label={POSTCARD_CAPTION_LABEL}
          area
          minHeight={memoryMetrics.postcardCaptionMin}
          value={caption}
          onChangeText={setCaption}
          editable={!posting}
        />

        <MemoryField
          label={POSTCARD_PLACE_LABEL}
          icon="pin"
          value={place}
          onChangeText={setPlace}
          editable={!posting}
          placeholder={DAY_PLACE_PLACEHOLDER}
        />
      </ScrollView>

      <View style={styles.rail}>
        <MemoryCta
          label={POST_CTA}
          disabled={!ready}
          busy={posting}
          onPress={() => void post()}
        />
      </View>
    </View>
  );
}


function StripTile({
  photo,
  index,
  onRemove,
}: {
  readonly photo: PickedPhoto;
  readonly index: number;
  readonly onRemove: () => void;
}) {
  const { enter, pop } = useTileEntrance();

  return (
    <Animated.View
      style={{
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
  screen: {
    flex: 1,
    backgroundColor: memoryColors.screen,
  },
  body: {
    paddingHorizontal: memoryMetrics.screenPadding,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 14,
  },
  stripBleed: {
    flexGrow: 0,
    marginHorizontal: -memoryMetrics.screenPadding,
  },
  strip: {
    paddingHorizontal: memoryMetrics.screenPadding,
    gap: memoryMetrics.tileGap,
  },
  tile: {
    width: memoryMetrics.stripPhoto,
    height: memoryMetrics.stripPhoto,
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
  add: {
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
  rail: {
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: memoryColors.screen,
  },
  pressed: {
    opacity: memoryMotion.pressOpacity,
  },
});
