import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { MediaThumb } from '../media/MediaThumb';
import { pickPhotos } from '../media/pickPhoto';
import type { PickedPhoto } from '../media/pickedPhoto';
import { memoryRepository } from '../repositories/memoryRepository';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import {
  DAY_ADD_PHOTO,
  DAY_CAPTION_LABEL,
  DAY_PHOTOS_LABEL,
  DAY_PLACE_LABEL,
  DAY_PLACE_PLACEHOLDER,
  POSTCARD_POST_CTA,
  POSTCARD_POST_FAILED,
  dayHeading,
  photoCountLabel,
} from './memoryCopy';


interface PostcardOnDayScreenProps {
  readonly diaryId: string;
  readonly dayId: string;
  readonly ordinal: number;
  readonly date: string;
  readonly dayPlace: string | null;
  readonly onPosted: () => void;
}


export function PostcardOnDayScreen({
  diaryId,
  dayId,
  ordinal,
  date,
  dayPlace,
  onPosted,
}: PostcardOnDayScreenProps) {
  const [photos, setPhotos] = useState<readonly PickedPhoto[]>([]);
  const [caption, setCaption] = useState('');
  const [place, setPlace] = useState(dayPlace ?? '');
  const [posting, setPosting] = useState(false);
  const [failed, setFailed] = useState(false);

  const ready = photos.length > 0;
  const full = photos.length >= memoryMetrics.photosPerPostcard;

  async function post(): Promise<void> {
    setPosting(true);
    setFailed(false);
    try {
      await memoryRepository.postOnDay(
        diaryId,
        dayId,
        {
          caption: caption.trim() === '' ? null : caption.trim(),
          place: place.trim() === '' ? null : place.trim(),
        },
        photos,
      );
      onPosted();
    } catch {
      setFailed(true);
      setPosting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>{dayHeading(ordinal, date)}</Text>

        <Text style={styles.label}>{DAY_PLACE_LABEL}</Text>
        <TextInput
          style={styles.input}
          value={place}
          onChangeText={setPlace}
          editable={!posting}
          placeholder={DAY_PLACE_PLACEHOLDER}
          placeholderTextColor={memoryColors.faint}
          accessibilityLabel={DAY_PLACE_LABEL}
        />

        <View style={styles.photosHeader}>
          <Text style={styles.label}>{DAY_PHOTOS_LABEL}</Text>
          <Text style={styles.count}>
            {photoCountLabel(photos.length, memoryMetrics.photosPerPostcard)}
          </Text>
        </View>

        <View style={styles.tiles}>
          {photos.map((photo, index) => (
            <Pressable
              key={photo.uri}
              style={styles.tile}
              accessibilityRole="button"
              accessibilityLabel={`Remove photo ${index + 1}`}
              onPress={() => setPhotos(photos.filter((_, at) => at !== index))}
            >
              <MediaThumb
                url={null}
                localPreview={photo.uri}
                style={styles.tilePhoto}
                accessibilityLabel={`Photo ${index + 1}`}
              />
            </Pressable>
          ))}

          {!full && (
            <AddTile
              onPress={() => {
                void pickPhotos(memoryMetrics.photosPerPostcard - photos.length).then((picked) => {
                  if (picked.length > 0) {
                    setPhotos([...photos, ...picked].slice(0, memoryMetrics.photosPerPostcard));
                  }
                });
              }}
            />
          )}
        </View>

        <Text style={styles.label}>{DAY_CAPTION_LABEL}</Text>
        <TextInput
          style={StyleSheet.flatten([styles.input, styles.area])}
          value={caption}
          onChangeText={setCaption}
          editable={!posting}
          multiline
          accessibilityLabel={DAY_CAPTION_LABEL}
        />

        {failed && <Text style={styles.failed}>{POSTCARD_POST_FAILED}</Text>}
      </ScrollView>

      <View style={styles.rail}>
        <AnimatedPressable
          style={StyleSheet.flatten([styles.cta, ready && !posting ? null : styles.ctaDisabled])}
          disabled={!ready || posting}
          accessibilityRole="button"
          accessibilityLabel={POSTCARD_POST_CTA}
          accessibilityState={{ disabled: !ready || posting, busy: posting }}
          onPress={() => void post()}
        >
          <Text style={[styles.ctaInk, ready && !posting ? null : styles.ctaInkDisabled]}>
            {POSTCARD_POST_CTA}
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}


function AddTile({ onPress }: { readonly onPress: () => void }) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      style={StyleSheet.flatten([styles.tile, styles.addTile, press.style])}
      accessibilityRole="button"
      accessibilityLabel={DAY_ADD_PHOTO}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Text style={styles.addTileInk}>{DAY_ADD_PHOTO}</Text>
    </AnimatedPressable>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: memoryColors.screen,
  },
  body: {
    padding: memoryMetrics.screenPadding,
    gap: 6,
  },
  heading: {
    ...memoryTypography.heading,
    color: memoryColors.title,
    marginBottom: 6,
  },
  label: {
    ...memoryTypography.label,
    color: memoryColors.body,
    marginTop: 6,
  },
  input: {
    ...memoryTypography.input,
    minHeight: memoryMetrics.fieldHeight,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.fieldRadius,
    paddingHorizontal: 12,
    backgroundColor: memoryColors.card,
    color: memoryColors.title,
  },
  area: {
    minHeight: memoryMetrics.fieldHeight * 2,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  photosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  count: {
    ...memoryTypography.small,
    color: memoryColors.muted,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: memoryMetrics.tileGap,
  },
  tile: {
    width: memoryMetrics.tileSize,
    height: memoryMetrics.tileSize,
    borderRadius: memoryMetrics.tileRadius,
    overflow: 'hidden',
    backgroundColor: memoryColors.tileWell,
  },
  tilePhoto: {
    width: '100%',
    height: '100%',
  },
  addTile: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: memoryColors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTileInk: {
    ...memoryTypography.small,
    color: memoryColors.muted,
    textAlign: 'center',
  },
  failed: {
    ...memoryTypography.meta,
    color: memoryColors.danger,
    marginTop: 8,
  },
  rail: {
    padding: memoryMetrics.screenPadding,
    borderTopWidth: 1,
    borderTopColor: memoryColors.hairline,
    backgroundColor: memoryColors.card,
  },
  cta: {
    height: memoryMetrics.ctaHeight,
    borderRadius: memoryMetrics.ctaRadius,
    backgroundColor: memoryColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    backgroundColor: memoryColors.disabledWell,
  },
  ctaInk: {
    ...memoryTypography.cta,
    color: memoryColors.card,
  },
  ctaInkDisabled: {
    color: memoryColors.disabledInk,
  },
});
