import { useState } from 'react';
import { spacing } from '../theme';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pickPhotos } from '../media/pickPhoto';
import type { Pin } from '../maps/pinRules';
import { pinAfterEdit } from '../maps/pinRules';
import type { PickedPhoto } from '../media/pickedPhoto';
import { memoryRepository } from '../repositories/memoryRepository';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import { DayCard } from './DayCard';
import { MemoryCta } from './MemoryCta';
import { MemoryHeader } from './MemoryHeader';
import { POSTCARD_POST_FAILED, POST_CTA, dayHeading } from './memoryCopy';


interface PostcardOnDayScreenProps {
  readonly diaryId: string;
  readonly diaryTitle: string;
  readonly dayId: string;
  readonly ordinal: number;
  readonly date: string;
  readonly dayPlace: string | null;
  readonly dayPin: Pin | null;
  readonly onPosted: () => void;
}


export function PostcardOnDayScreen({
  diaryId,
  diaryTitle,
  dayId,
  ordinal,
  date,
  dayPlace,
  dayPin,
  onPosted,
}: PostcardOnDayScreenProps) {
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<readonly PickedPhoto[]>([]);
  const [caption, setCaption] = useState('');
  const [place, setPlace] = useState(dayPlace ?? '');
  const [pin, setPin] = useState<Pin | null>(dayPin ?? null);
  const [pinnedAs, setPinnedAs] = useState(dayPin == null ? '' : (dayPlace ?? ''));
  const [posting, setPosting] = useState(false);
  const [failed, setFailed] = useState(false);

  const ready = photos.length > 0;

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
          pin: pinAfterEdit(pin, pinnedAs, place),
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
      <MemoryHeader pill="POSTCARD" title={dayHeading(ordinal, date)} subtitle={diaryTitle} />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <DayCard
          ordinal={ordinal}
          place={place}
          caption={caption}
          photos={photos}
          editable={!posting}
          pin={pin}
        onPlace={(picked, droppedPin) => {
          setPlace(picked);
          setPin(droppedPin);
          setPinnedAs(droppedPin === null ? '' : picked);
        }}
          onCaption={setCaption}
          onAddPhotos={() => {
            void pickPhotos(memoryMetrics.photosPerPostcard - photos.length).then((picked) => {
              if (picked.length > 0) {
                setPhotos([...photos, ...picked].slice(0, memoryMetrics.photosPerPostcard));
              }
            });
          }}
          onRemovePhoto={(at) => setPhotos(photos.filter((_, index) => index !== at))}
        />
      </ScrollView>

      <View style={[styles.rail, { paddingBottom: insets.bottom + spacing.md }]}>
        <MemoryCta
          label={POST_CTA}
          disabled={!ready}
          busy={posting}
          onPress={() => void post()}
        />
        {failed && <Text style={styles.failed}>{POSTCARD_POST_FAILED}</Text>}
      </View>
    </View>
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
});
