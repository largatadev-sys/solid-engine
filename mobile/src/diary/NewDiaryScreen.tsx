import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { MediaThumb } from '../media/MediaThumb';
import { pickPhoto } from '../media/pickPhoto';
import type { PickedPhoto } from '../media/pickedPhoto';
import { memoryRepository } from '../repositories/memoryRepository';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import { DateRangeSheet } from './DateRangeSheet';
import { emptyRange, isComplete, type DateRange } from './dateRange';
import {
  DIARY_COVER_EMPTY,
  DIARY_COVER_LABEL,
  DIARY_CREATE_FAILED,
  DIARY_DESTINATION_LABEL,
  DIARY_DESTINATION_PLACEHOLDER,
  DIARY_END_LABEL,
  DIARY_END_PLACEHOLDER,
  DIARY_NEXT_CTA,
  DIARY_START_LABEL,
  DIARY_TITLE_LABEL,
  DIARY_TITLE_PLACEHOLDER,
  DIARY_WHEN_LABEL,
  NEW_DIARY_BADGE,
  NEW_DIARY_SUBTITLE,
  NEW_DIARY_TITLE,
  shortDate,
} from './memoryCopy';


export function NewDiaryScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
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
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.badge}>{NEW_DIARY_BADGE}</Text>
        <Text style={styles.heading}>{NEW_DIARY_TITLE}</Text>
        <Text style={styles.subtitle}>{NEW_DIARY_SUBTITLE}</Text>

        <Field label={DIARY_TITLE_LABEL} required>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            editable={!creating}
            placeholder={DIARY_TITLE_PLACEHOLDER}
            placeholderTextColor={memoryColors.faint}
            accessibilityLabel={DIARY_TITLE_LABEL}
          />
        </Field>

        <Field label={DIARY_DESTINATION_LABEL}>
          <TextInput
            style={styles.input}
            value={destination}
            onChangeText={setDestination}
            editable={!creating}
            placeholder={DIARY_DESTINATION_PLACEHOLDER}
            placeholderTextColor={memoryColors.faint}
            accessibilityLabel={DIARY_DESTINATION_LABEL}
          />
        </Field>

        <Field label={DIARY_COVER_LABEL}>
          <Pressable
            style={styles.cover}
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
              <Text style={styles.coverEmpty}>{DIARY_COVER_EMPTY}</Text>
            ) : (
              <MediaThumb
                url={null}
                localPreview={cover.uri}
                style={styles.coverPhoto}
                accessibilityLabel={DIARY_COVER_LABEL}
              />
            )}
          </Pressable>
        </Field>

        <Field label={DIARY_WHEN_LABEL} required>
          <View style={styles.dates}>
            <DateChip
              label={DIARY_START_LABEL}
              value={range.start === null ? DIARY_START_LABEL : shortDate(range.start)}
              filled={range.start !== null}
              onPress={() => setCalendarOpen(true)}
            />
            <DateChip
              label={DIARY_END_LABEL}
              value={range.end === null ? DIARY_END_PLACEHOLDER : shortDate(range.end)}
              filled={range.end !== null}
              onPress={() => setCalendarOpen(true)}
            />
          </View>
        </Field>

        {failed && <Text style={styles.failed}>{DIARY_CREATE_FAILED}</Text>}
      </ScrollView>

      <View style={styles.rail}>
        <AnimatedPressable
          style={StyleSheet.flatten([styles.cta, ready && !creating ? null : styles.ctaDisabled])}
          disabled={!ready || creating}
          accessibilityRole="button"
          accessibilityLabel={DIARY_NEXT_CTA}
          accessibilityState={{ disabled: !ready || creating, busy: creating }}
          onPress={() => void create()}
        >
          <Text style={[styles.ctaInk, ready && !creating ? null : styles.ctaInkDisabled]}>
            {DIARY_NEXT_CTA}
          </Text>
        </AnimatedPressable>
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


function Field({
  label,
  required = false,
  children,
}: {
  readonly label: string;
  readonly required?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}


function DateChip({
  label,
  value,
  filled,
  onPress,
}: {
  readonly label: string;
  readonly value: string;
  readonly filled: boolean;
  readonly onPress: () => void;
}) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      style={StyleSheet.flatten([styles.dateChip, press.style])}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Text style={[styles.dateChipInk, filled ? null : styles.dateChipInkEmpty]}>{value}</Text>
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
    gap: memoryMetrics.dayGap,
  },
  badge: {
    ...memoryTypography.badge,
    color: memoryColors.accent,
  },
  heading: {
    ...memoryTypography.heading,
    color: memoryColors.title,
  },
  subtitle: {
    ...memoryTypography.subtitle,
    color: memoryColors.muted,
    marginBottom: 4,
  },
  field: {
    gap: 6,
  },
  label: {
    ...memoryTypography.label,
    color: memoryColors.body,
  },
  required: {
    color: memoryColors.accent,
  },
  input: {
    height: memoryMetrics.fieldHeight,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.fieldRadius,
    paddingHorizontal: 12,
    backgroundColor: memoryColors.card,
    ...memoryTypography.input,
    color: memoryColors.title,
  },
  cover: {
    height: memoryMetrics.coverHeight,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.fieldRadius,
    backgroundColor: memoryColors.tileWell,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverEmpty: {
    ...memoryTypography.body,
    color: memoryColors.muted,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  dates: {
    flexDirection: 'row',
    gap: memoryMetrics.tileGap,
  },
  dateChip: {
    flex: 1,
    height: memoryMetrics.fieldHeight,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.fieldRadius,
    backgroundColor: memoryColors.card,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  dateChipInk: {
    ...memoryTypography.input,
    color: memoryColors.title,
  },
  dateChipInkEmpty: {
    color: memoryColors.faint,
  },
  failed: {
    ...memoryTypography.meta,
    color: memoryColors.danger,
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
