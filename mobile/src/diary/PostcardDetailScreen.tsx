import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { MediaThumb } from '../media/MediaThumb';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import type { PostcardResponse } from '../types/api';
import { dayOrdinalLabel } from './memoryCopy';


interface PostcardDetailScreenProps {
  readonly postcard: PostcardResponse;
  readonly diaryTitle: string | null;
  readonly authorName: string;
  readonly authorHandle: string;
  readonly owned: boolean;
  readonly onOpenAuthor: () => void;
  readonly onOpenDiary?: () => void;
  readonly onMenu?: () => void;
}


export function PostcardDetailScreen({
  postcard,
  diaryTitle,
  authorName,
  authorHandle,
  owned,
  onOpenAuthor,
  onOpenDiary,
  onMenu,
}: PostcardDetailScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <View style={styles.head}>
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
        {owned && onMenu !== undefined && (
          <Control glyph="⋯" label="Postcard menu" onPress={onMenu} />
        )}
      </View>

      {postcard.photos.map((photo, index) => (
        <MediaThumb
          key={photo.id}
          url={photo.url}
          style={styles.photo}
          accessibilityLabel={`Photo ${index + 1}`}
          fallback={<View style={styles.photoEmpty} />}
        />
      ))}

      {postcard.caption !== null && <Text style={styles.caption}>{postcard.caption}</Text>}

      {postcard.place !== null && <Text style={styles.meta}>{postcard.place}</Text>}

      {diaryTitle !== null && onOpenDiary !== undefined && (
        <AnimatedPressable
          style={styles.diaryRow}
          accessibilityRole="button"
          accessibilityLabel={diaryTitle}
          onPress={onOpenDiary}
        >
          <Text style={styles.diaryTitle}>{diaryTitle}</Text>
          {postcard.dayOrdinal !== null && (
            <Text style={styles.diaryDay}>{dayOrdinalLabel(postcard.dayOrdinal)}</Text>
          )}
        </AnimatedPressable>
      )}
    </ScrollView>
  );
}


function Control({
  glyph,
  label,
  onPress,
}: {
  readonly glyph: string;
  readonly label: string;
  readonly onPress: () => void;
}) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      style={StyleSheet.flatten([styles.control, press.style])}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Text style={styles.controlInk}>{glyph}</Text>
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
    alignItems: 'center',
  },
  author: {
    flex: 1,
  },
  authorInk: {
    ...memoryTypography.meta,
    color: memoryColors.body,
  },
  control: {
    width: memoryMetrics.kebab + 8,
    height: memoryMetrics.kebab + 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  controlInk: {
    ...memoryTypography.chevron,
    color: memoryColors.body,
  },
  photo: {
    width: '100%',
    height: 260,
    borderRadius: memoryMetrics.tileRadius,
    backgroundColor: memoryColors.tileWell,
  },
  photoEmpty: {
    width: '100%',
    height: '100%',
    backgroundColor: memoryColors.tileWell,
  },
  caption: {
    ...memoryTypography.body,
    color: memoryColors.title,
  },
  meta: {
    ...memoryTypography.small,
    color: memoryColors.muted,
  },
  diaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: memoryColors.card,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.cardRadius,
    padding: memoryMetrics.cardPadding,
  },
  diaryTitle: {
    ...memoryTypography.label,
    color: memoryColors.title,
  },
  diaryDay: {
    ...memoryTypography.small,
    color: memoryColors.muted,
  },
});
