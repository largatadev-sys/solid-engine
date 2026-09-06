import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { MediaThumb } from '../media/MediaThumb';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import type { DiaryDayResponse, DiaryPostcardResponse, DiaryResponse } from '../types/api';
import {
  ADD_A_DAY_CTA,
  ADD_POSTCARD_CTA,
  NO_POSTCARDS_ON_THIS_DAY,
  dateSpanLabel,
  dayDateLabel,
  dayOrdinalLabel,
  sectionMetaLine,
} from './memoryCopy';


interface DiaryDetailScreenProps {
  readonly diary: DiaryResponse;
  readonly authorName: string;
  readonly authorHandle: string;
  readonly owned: boolean;
  readonly onOpenAuthor: () => void;
  readonly onOpenPostcard: (postcardId: string) => void;
  readonly onAddPostcard?: (dayId: string) => void;
  readonly onAddDay?: () => void;
  readonly onDiaryMenu?: () => void;
}


export function DiaryDetailScreen({
  diary,
  authorName,
  authorHandle,
  owned,
  onOpenAuthor,
  onOpenPostcard,
  onAddPostcard,
  onAddDay,
  onDiaryMenu,
}: DiaryDetailScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title}>{diary.title}</Text>
          <Text style={styles.meta}>
            {sectionMetaLine(diary.destination, diary.dayCount)} ·{' '}
            {dateSpanLabel(diary.startDate, diary.endDate)}
          </Text>
        </View>
        {owned && onDiaryMenu !== undefined && (
          <Control glyph="⋯" label={`${diary.title} menu`} onPress={onDiaryMenu} />
        )}
      </View>

      <AnimatedPressable
        style={styles.author}
        accessibilityRole="button"
        accessibilityLabel={authorName}
        onPress={onOpenAuthor}
      >
        <Text style={styles.authorInk}>
          {authorName} · @{authorHandle}
        </Text>
      </AnimatedPressable>

      {diary.days.map((day) => (
        <DayBlock
          key={day.id}
          day={day}
          owned={owned}
          onOpenPostcard={onOpenPostcard}
          onAddPostcard={onAddPostcard}
        />
      ))}

      {owned && onAddDay !== undefined && (
        <AnimatedPressable
          style={styles.addDay}
          accessibilityRole="button"
          accessibilityLabel={ADD_A_DAY_CTA}
          onPress={onAddDay}
        >
          <Text style={styles.addDayInk}>{ADD_A_DAY_CTA}</Text>
        </AnimatedPressable>
      )}
    </ScrollView>
  );
}


function DayBlock({
  day,
  owned,
  onOpenPostcard,
  onAddPostcard,
}: {
  readonly day: DiaryDayResponse;
  readonly owned: boolean;
  readonly onOpenPostcard: (postcardId: string) => void;
  readonly onAddPostcard?: (dayId: string) => void;
}) {
  return (
    <View style={styles.day}>
      <View style={styles.dayHead}>
        <Text style={styles.dayHeading}>
          {dayOrdinalLabel(day.ordinal)}
          <Text style={styles.dayDate}>
            {'   '}
            {dayDateLabel(day.date)}
            {day.place === null ? '' : ` · ${day.place}`}
          </Text>
        </Text>
        {owned && onAddPostcard !== undefined && (
          <Control
            glyph={ADD_POSTCARD_CTA}
            label={`${ADD_POSTCARD_CTA} to ${dayOrdinalLabel(day.ordinal)}`}
            onPress={() => onAddPostcard(day.id)}
            wide
          />
        )}
      </View>

      {day.postcards.length === 0 ? (
        <Text style={styles.dayEmpty}>{NO_POSTCARDS_ON_THIS_DAY}</Text>
      ) : (
        day.postcards.map((postcard) => (
          <DayPostcard key={postcard.id} postcard={postcard} onPress={onOpenPostcard} />
        ))
      )}
    </View>
  );
}


function DayPostcard({
  postcard,
  onPress,
}: {
  readonly postcard: DiaryPostcardResponse;
  readonly onPress: (postcardId: string) => void;
}) {
  return (
    <AnimatedPressable
      style={styles.postcard}
      accessibilityRole="button"
      accessibilityLabel={postcard.caption ?? 'Postcard'}
      onPress={() => onPress(postcard.id)}
    >
      <MediaThumb
        url={postcard.photos[0]?.url ?? null}
        style={styles.postcardPhoto}
        accessibilityLabel="Postcard"
        fallback={<View style={styles.photoEmpty} />}
      />
      {postcard.caption !== null && (
        <Text style={styles.postcardCaption}>{postcard.caption}</Text>
      )}
    </AnimatedPressable>
  );
}


function Control({
  glyph,
  label,
  onPress,
  wide = false,
}: {
  readonly glyph: string;
  readonly label: string;
  readonly onPress: () => void;
  readonly wide?: boolean;
}) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      style={StyleSheet.flatten([styles.control, wide ? styles.controlWide : null, press.style])}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Text style={wide ? styles.controlWideInk : styles.controlInk}>{glyph}</Text>
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
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headText: {
    flex: 1,
  },
  title: {
    ...memoryTypography.heading,
    color: memoryColors.title,
  },
  meta: {
    ...memoryTypography.small,
    color: memoryColors.muted,
    marginTop: 2,
  },
  author: {
    paddingVertical: 4,
  },
  authorInk: {
    ...memoryTypography.meta,
    color: memoryColors.body,
  },
  day: {
    backgroundColor: memoryColors.card,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.cardRadius,
    padding: memoryMetrics.cardPadding,
    gap: 10,
  },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayHeading: {
    ...memoryTypography.dayHeading,
    color: memoryColors.title,
    flex: 1,
  },
  dayDate: {
    ...memoryTypography.small,
    color: memoryColors.muted,
  },
  dayEmpty: {
    ...memoryTypography.meta,
    color: memoryColors.faint,
  },
  postcard: {
    gap: 8,
  },
  postcardPhoto: {
    width: '100%',
    height: 200,
    borderRadius: memoryMetrics.tileRadius,
    backgroundColor: memoryColors.tileWell,
  },
  photoEmpty: {
    width: '100%',
    height: '100%',
    backgroundColor: memoryColors.tileWell,
  },
  postcardCaption: {
    ...memoryTypography.body,
    color: memoryColors.title,
  },
  control: {
    width: memoryMetrics.kebab + 8,
    height: memoryMetrics.kebab + 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  controlWide: {
    width: 'auto',
    paddingHorizontal: 10,
  },
  controlInk: {
    ...memoryTypography.chevron,
    color: memoryColors.body,
  },
  controlWideInk: {
    ...memoryTypography.small,
    color: memoryColors.accent,
  },
  addDay: {
    height: memoryMetrics.ctaHeight,
    borderRadius: memoryMetrics.ctaRadius,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: memoryColors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDayInk: {
    ...memoryTypography.label,
    color: memoryColors.accent,
  },
});
