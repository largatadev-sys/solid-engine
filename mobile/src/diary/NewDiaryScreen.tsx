import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MediaThumb } from '../media/MediaThumb';
import { pickPhoto } from '../media/pickPhoto';
import type { PickedPhoto } from '../media/pickedPhoto';
import type { Pin } from '../maps/pinRules';
import { pinAfterEdit } from '../maps/pinRules';
import { memoryRepository } from '../repositories/memoryRepository';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';
import { DateChips } from './DateChips';
import { DateRangeSheet } from './DateRangeSheet';
import { emptyRange, isComplete, type DateRange } from './dateRange';
import { MemoryCta } from './MemoryCta';
import { MemoryField } from './MemoryField';
import { MemoryPlaceField } from './MemoryPlaceField';
import { MemoryHeader } from './MemoryHeader';
import { MemoryIcon } from './MemoryIcon';
import {
  DIARY_COVER_EMPTY,
  DIARY_COVER_LABEL,
  DIARY_CREATE_FAILED,
  DIARY_DESTINATION_LABEL,
  DIARY_DESTINATION_PLACEHOLDER,
  DIARY_NEXT_CTA,
  DIARY_TITLE_LABEL,
  NEW_DIARY_SUBTITLE,
  NEW_DIARY_TITLE,
} from './memoryCopy';


export function NewDiaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [pin, setPin] = useState<Pin | null>(null);
  const [pinnedAs, setPinnedAs] = useState('');
  const [cover, setCover] = useState<PickedPhoto | null>(null);
  const [range, setRange] = useState<DateRange>(emptyRange);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [failed, setFailed] = useState(false);

  const ready = title.trim() !== '' && isComplete(range);

  async function create() {
    if (!ready || range.start === null || range.end === null) return;

    setCreating(true);
    setFailed(false);
    try {
      const diary = await memoryRepository.createDiary({
        title: title.trim(),
        destination: destination.trim() === '' ? null : destination.trim(),
        pin: pinAfterEdit(pin, pinnedAs, destination),
        startDate: range.start,
        endDate: range.end,
      });
      if (cover !== null) await memoryRepository.setCover(diary.id, cover);

      router.replace({ pathname: '/diaries/[id]/setup', params: { id: diary.id } });
    } catch {
      setFailed(true);
      setCreating(false);
    }
  }

  return (
    <View style={styles.screen}>
      <MemoryHeader pill="DIARY" title={NEW_DIARY_TITLE} subtitle={NEW_DIARY_SUBTITLE} />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <MemoryField
          label={DIARY_TITLE_LABEL}
          required
          value={title}
          onChangeText={setTitle}
          editable={!creating}
        />

        <MemoryPlaceField
          label={DIARY_DESTINATION_LABEL}
          value={destination}
          pin={pin}
          openNear={pin}
          editable={!creating}
          placeholder={DIARY_DESTINATION_PLACEHOLDER}
          onPicked={(place, picked) => {
            setDestination(place);
            setPin(picked);
            setPinnedAs(picked === null ? '' : place);
          }}
        />

        <View style={styles.field}>
          <Text style={styles.label}>{DIARY_COVER_LABEL}</Text>
          <Pressable
            style={({ pressed }) =>
              StyleSheet.flatten([styles.cover, pressed ? styles.pressed : null])
            }
            disabled={creating}
            accessibilityRole="button"
            accessibilityLabel={DIARY_COVER_EMPTY}
            onPress={() => {
              void pickPhoto().then((picked) => {
                if (picked !== null) setCover(picked);
              });
            }}
          >
            {cover === null ? (
              <>
                <MemoryIcon name="image" size={22} color={memoryColors.muted} />
                <Text style={styles.coverEmpty}>{DIARY_COVER_EMPTY}</Text>
              </>
            ) : (
              <MediaThumb
                url={null}
                localPreview={cover.uri}
                style={styles.coverPhoto}
                accessibilityLabel={DIARY_COVER_LABEL}
              />
            )}
          </Pressable>
        </View>

        <DateChips range={range} onPress={() => setCalendarOpen(true)} />
      </ScrollView>

      <View style={[styles.rail, { paddingBottom: insets.bottom + memoryMetrics.railFloor }]}>
        <MemoryCta
          label={DIARY_NEXT_CTA}
          disabled={!ready}
          busy={creating}
          onPress={() => void create()}
        />
        {failed && <Text style={styles.failed}>{DIARY_CREATE_FAILED}</Text>}
      </View>

      <DateRangeSheet
        open={calendarOpen}
        range={range}
        onDone={(picked) => {
          setRange(picked);
          setCalendarOpen(false);
        }}
        onDismiss={() => setCalendarOpen(false)}
      />
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
    gap: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    ...memoryTypography.fieldLabel,
    color: memoryColors.label,
  },
  cover: {
    height: memoryMetrics.coverHeight,
    borderWidth: memoryMetrics.dashedWidth,
    borderStyle: 'dashed',
    borderColor: memoryColors.dashed,
    borderRadius: memoryMetrics.coverRadius,
    backgroundColor: memoryColors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  coverEmpty: {
    ...memoryTypography.input,
    color: memoryColors.muted,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
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
