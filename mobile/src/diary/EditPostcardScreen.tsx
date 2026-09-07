import { useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dragToScroll } from '../components/stripScroll';
import { MediaThumb } from '../media/MediaThumb';
import { pickPhotos } from '../media/pickPhoto';
import type { PickedPhoto } from '../media/pickedPhoto';
import type { Pin } from '../maps/pinRules';
import { pinAfterEdit } from '../maps/pinRules';
import { useExitGuard } from '../navigation/useExitGuard';
import { memoryRepository } from '../repositories/memoryRepository';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';
import type { DiaryPhotoResponse, PostcardResponse } from '../types/api';
import { askMemoryConfirmation } from './MemoryConfirm';
import { MemoryCta } from './MemoryCta';
import { MemoryField } from './MemoryField';
import { MemoryPlaceField } from './MemoryPlaceField';
import { MemoryHeader } from './MemoryHeader';
import { MemoryIcon } from './MemoryIcon';
import { SelectedCheck, useTileEntrance } from './PhotoTiles';
import {
  DAY_ADD_PHOTO,
  DAY_PLACE_PLACEHOLDER,
  DISCARD_ACTION,
  DISCARD_CHANGES_BODY,
  DISCARD_CHANGES_TITLE,
  EDIT_POSTCARD_TITLE,
  KEEP_EDITING_ACTION,
  POSTCARD_CAPTION_LABEL,
  POSTCARD_PLACE_LABEL,
  SAVE_CTA,
  SAVE_FAILED,
} from './memoryCopy';


interface EditPostcardScreenProps {
  readonly postcard: PostcardResponse;
  readonly onSaved: (postcard: PostcardResponse) => void;
}


export function EditPostcardScreen({ postcard, onSaved }: EditPostcardScreenProps) {
  const insets = useSafeAreaInsets();
  const [drag] = useState(() => dragToScroll(() => memoryMetrics.stripPhoto + memoryMetrics.tileGap));
  const [caption, setCaption] = useState(postcard.caption ?? '');
  const [place, setPlace] = useState(postcard.place ?? '');
  const [pin, setPin] = useState<Pin | null>(postcard.pin);
  const [pinnedAs, setPinnedAs] = useState(postcard.pin === null ? '' : (postcard.place ?? ''));
  const [removed, setRemoved] = useState<readonly string[]>([]);
  const [picked, setPicked] = useState<readonly PickedPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);

  const kept = postcard.photos.filter((photo) => !removed.includes(photo.id));
  const total = kept.length + picked.length;
  const full = total >= memoryMetrics.photosPerPostcard;
  const trimmed = caption.trim();
  const captionChanged = trimmed !== (postcard.caption ?? '');
  const trimmedPlace = place.trim();
  const nextPin = pinAfterEdit(pin, pinnedAs, place);
  const placeChanged = trimmedPlace !== (postcard.place ?? '') || nextPin !== postcard.pin;
  const dirty =
    !saved && (captionChanged || placeChanged || removed.length > 0 || picked.length > 0);
  const ready = dirty && total > 0;

  useExitGuard(dirty, (proceed) => {
    askMemoryConfirmation(
      {
        title: DISCARD_CHANGES_TITLE,
        body: DISCARD_CHANGES_BODY,
        confirmLabel: DISCARD_ACTION,
        cancelLabel: KEEP_EDITING_ACTION,
      },
      proceed,
    );
  });

  async function save(): Promise<void> {
    if (!ready) return;

    setSaving(true);
    setFailed(false);
    try {
      let next = postcard;
      if (captionChanged) {
        next = await memoryRepository.recaptionPostcard(postcard.id, trimmed === '' ? null : trimmed);
      }
      if (placeChanged) {
        next = await memoryRepository.placePostcard(
          postcard.id,
          trimmedPlace === '' ? null : trimmedPlace,
          nextPin,
        );
      }
      if (picked.length > 0) {
        next = await memoryRepository.addPostcardPhotos(postcard.id, picked);
      }
      for (const photoId of removed) {
        next = await memoryRepository.removePostcardPhoto(postcard.id, photoId);
      }
      setSaved(true);
      onSaved(next);
    } catch {
      setFailed(true);
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <MemoryHeader pill="POSTCARD" title={EDIT_POSTCARD_TITLE} />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.stripBleed}
          contentContainerStyle={styles.strip}
          {...drag}
        >
          {kept.map((photo, index) => (
            <StoredTile
              key={photo.id}
              photo={photo}
              index={index}
              disabled={saving}
              onRemove={() => setRemoved((current) => [...current, photo.id])}
            />
          ))}

          {picked.map((photo, index) => (
            <PickedTile
              key={photo.uri}
              photo={photo}
              index={kept.length + index}
              disabled={saving}
              onRemove={() => setPicked((current) => current.filter((_, at) => at !== index))}
            />
          ))}

          {!full && (
            <Pressable
              style={({ pressed }) =>
                StyleSheet.flatten([styles.tile, styles.add, pressed ? styles.pressed : null])
              }
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={DAY_ADD_PHOTO}
              onPress={() => {
                void pickPhotos(memoryMetrics.photosPerPostcard - total).then((chosen) => {
                  if (chosen.length > 0) setPicked((current) => [...current, ...chosen]);
                });
              }}
            >
              <MemoryIcon name="plus" size={22} color={memoryColors.muted} />
              <Text style={styles.addLabel}>{DAY_ADD_PHOTO}</Text>
            </Pressable>
          )}
        </ScrollView>

        <MemoryField
          label={POSTCARD_CAPTION_LABEL}
          area
          minHeight={memoryMetrics.postcardCaptionMin}
          value={caption}
          onChangeText={setCaption}
          editable={!saving}
        />

        <MemoryPlaceField
          label={POSTCARD_PLACE_LABEL}
          glyph
          value={place}
          pin={pin}
          openNear={pin}
          editable={!saving}
          onPicked={(pickedPlace, droppedPin) => {
            setPlace(pickedPlace);
            setPin(droppedPin);
            setPinnedAs(droppedPin === null ? '' : pickedPlace);
          }}
          placeholder={DAY_PLACE_PLACEHOLDER}
        />
      </ScrollView>

      <View style={[styles.rail, { paddingBottom: insets.bottom + memoryMetrics.railFloor }]}>
        <MemoryCta label={SAVE_CTA} disabled={!ready} busy={saving} onPress={() => void save()} />
        {failed && <Text style={styles.failed}>{SAVE_FAILED}</Text>}
      </View>
    </View>
  );
}


function StoredTile({
  photo,
  index,
  disabled,
  onRemove,
}: {
  readonly photo: DiaryPhotoResponse;
  readonly index: number;
  readonly disabled: boolean;
  readonly onRemove: () => void;
}) {
  const settled = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      style={({ pressed }) => StyleSheet.flatten([styles.tile, pressed ? styles.tilePressed : null])}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Remove photo ${index + 1}`}
      onPress={onRemove}
    >
      <MediaThumb
        url={photo.url}
        full
        style={styles.photo}
        accessibilityLabel={`Photo ${index + 1}`}
        fallback={<View style={styles.photo} />}
      />
      <SelectedCheck pop={settled} />
    </Pressable>
  );
}


function PickedTile({
  photo,
  index,
  disabled,
  onRemove,
}: {
  readonly photo: PickedPhoto;
  readonly index: number;
  readonly disabled: boolean;
  readonly onRemove: () => void;
}) {
  const { pop } = useTileEntrance();

  return (
    <Pressable
      style={({ pressed }) => StyleSheet.flatten([styles.tile, pressed ? styles.tilePressed : null])}
      disabled={disabled}
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
  addLabel: {
    ...memoryTypography.addTile,
    color: memoryColors.muted,
  },
  rail: {
    paddingTop: 8,
    paddingBottom: 16,
    gap: 8,
    backgroundColor: memoryColors.screen,
  },
  failed: {
    ...memoryTypography.meta13,
    color: memoryColors.danger,
    paddingHorizontal: memoryMetrics.screenPadding,
  },
  pressed: {
    opacity: memoryMotion.pressOpacity,
  },
});
