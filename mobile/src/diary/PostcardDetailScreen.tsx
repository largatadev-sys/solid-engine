import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dragToScroll, PAGING } from '../components/stripScroll';
import { MediaThumb } from '../media/MediaThumb';
import { useSafeBack } from '../navigation/safeBack';
import { initialsFor } from '../onboarding/initials';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';
import type { PostcardResponse } from '../types/api';
import { BACK_LABEL, dayMetaLine, dayOrdinalLabel, photoIndexPill, postedOnLabel } from './memoryCopy';
import { MemoryIcon } from './MemoryIcon';
import { MemoryPlaceLink } from './MemoryPlaceLink';


export interface DiaryRow {
  readonly title: string;
  readonly ordinal: number;
  readonly date: string;
}


interface PostcardDetailScreenProps {
  readonly postcard: PostcardResponse;
  readonly diaryRow: DiaryRow | null;
  readonly authorName: string;
  readonly authorHandle: string;
  readonly authorAvatarUrl: string | null;
  readonly owned: boolean;
  readonly onOpenDiary?: () => void;
  readonly onMenu?: () => void;
}


export function PostcardDetailScreen({
  postcard,
  diaryRow,
  authorName,
  authorAvatarUrl,
  owned,
  onOpenDiary,
  onMenu,
}: PostcardDetailScreenProps) {
  const [drag] = useState(() => dragToScroll((viewport) => viewport));
  const insets = useSafeAreaInsets();
  const goBack = useSafeBack();
  const [shownIndex, setShownIndex] = useState(0);

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { marginTop: insets.top }]}>
        <Pressable
          style={({ pressed }) => StyleSheet.flatten([styles.topButton, pressed ? styles.roundPressed : null])}
          accessibilityRole="button"
          accessibilityLabel={BACK_LABEL}
          onPress={goBack}
        >
          <MemoryIcon name="chevronLeft" size={20} color={memoryColors.title} />
        </Pressable>
        {owned && onMenu !== undefined ? (
          <Pressable
            style={({ pressed }) => StyleSheet.flatten([styles.topButton, pressed ? styles.roundPressed : null])}
            accessibilityRole="button"
            accessibilityLabel="Postcard menu"
            onPress={onMenu}
          >
            <MemoryIcon name="kebab" size={18} color={memoryColors.title} />
          </Pressable>
        ) : (
          <View style={styles.topButton} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.carousel}>
          <ScrollView
            horizontal
            {...PAGING}
            {...drag}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const width = event.nativeEvent.layoutMeasurement.width;
              if (width > 0) setShownIndex(Math.round(event.nativeEvent.contentOffset.x / width));
            }}
          >
            {postcard.photos.map((photo, index) => (
              <View key={photo.id} style={styles.slide}>
                <MediaThumb
                  url={photo.url}
                  full
                  style={styles.fill}
                  accessibilityLabel={`Photo ${index + 1}`}
                  fallback={<View style={styles.fill} />}
                />
              </View>
            ))}
          </ScrollView>

          {postcard.photos.length > 1 && (
            <>
              <View style={styles.photoPill}>
                <Text style={styles.photoPillInk}>
                  {photoIndexPill(shownIndex + 1, postcard.photos.length)}
                </Text>
              </View>
              <View style={styles.dots}>
                {postcard.photos.map((photo, index) => (
                  <View
                    key={photo.id}
                    style={[styles.dot, index === shownIndex ? styles.dotOn : styles.dotOff]}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.text}>
          {postcard.caption !== null && <Text style={styles.caption}>{postcard.caption}</Text>}

          {postcard.place !== null && (
            <View style={styles.placeRow}>
              <MemoryPlaceLink
                place={postcard.place}
                pin={postcard.pin}
                glyph={13}
                style={styles.placeInk}
              />
            </View>
          )}

          <View style={styles.divider} />

          {diaryRow !== null && onOpenDiary !== undefined && (
            <Pressable
              style={({ pressed }) => StyleSheet.flatten([styles.diaryRow, pressed ? styles.pressed : null])}
              accessibilityRole="button"
              accessibilityLabel={diaryRow.title}
              onPress={onOpenDiary}
            >
              <MemoryIcon name="bookPlain" size={16} color={memoryColors.accent} />
              <View style={styles.diaryRowText}>
                <Text style={styles.diaryRowTitle} numberOfLines={1}>{diaryRow.title}</Text>
                <Text style={styles.diaryRowMeta}>
                  {dayOrdinalLabel(diaryRow.ordinal)} · {dayMetaLine(diaryRow.date, null)}
                </Text>
              </View>
              <MemoryIcon name="chevronRight" size={14} color={memoryColors.faint} strokeWidth={2.4} />
            </Pressable>
          )}

          <View style={styles.authorRow}>
            <MediaThumb
              url={authorAvatarUrl}
              style={styles.avatar}
              fallbackStyle={styles.avatarWell}
              accessibilityLabel={authorName}
              fallback={<Text style={styles.initials}>{initialsFor(authorName, null)}</Text>}
            />
            <View style={styles.authorText}>
              <Text style={styles.authorName}>{authorName}</Text>
              <Text style={styles.authorMeta}>{postedOnLabel(postcard.createdAt)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: memoryColors.screen,
  },
  topBar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  topButton: {
    width: memoryMetrics.headerButton,
    height: memoryMetrics.headerButton,
    borderRadius: memoryMetrics.headerButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundPressed: {
    transform: [{ scale: memoryMotion.roundPressScale }],
  },
  body: {
    paddingBottom: 32,
  },
  carousel: {
    marginTop: 6,
    width: '100%',
    aspectRatio: 1,
    backgroundColor: memoryColors.wellDivider,
  },
  slide: {
    width: memoryMetrics.detailPhoto,
    maxWidth: '100%',
    aspectRatio: 1,
  },
  fill: {
    width: '100%',
    height: '100%',
    backgroundColor: memoryColors.wellDivider,
  },
  photoPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: memoryColors.photoPill,
    borderRadius: 999,
  },
  photoPillInk: {
    ...memoryTypography.cardMetaStrong,
    color: memoryColors.white,
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: memoryMetrics.dot,
    height: memoryMetrics.dot,
    borderRadius: memoryMetrics.dot / 2,
  },
  dotOn: {
    backgroundColor: memoryColors.white,
  },
  dotOff: {
    backgroundColor: memoryColors.onCoverMuted,
  },
  text: {
    paddingVertical: memoryMetrics.detailBodyPaddingV,
    paddingHorizontal: memoryMetrics.detailBodyPaddingH,
    gap: 10,
  },
  caption: {
    ...memoryTypography.captionLarge,
    color: memoryColors.title,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  placeInk: {
    ...memoryTypography.placeRow,
    color: memoryColors.muted,
  },
  divider: {
    height: 1,
    backgroundColor: memoryColors.divider,
  },
  diaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: memoryColors.diaryRowWell,
    borderWidth: 1,
    borderColor: memoryColors.diaryRowBorder,
    borderRadius: memoryMetrics.diaryRowRadius,
    paddingVertical: memoryMetrics.diaryRowPaddingV,
    paddingHorizontal: memoryMetrics.diaryRowPaddingH,
  },
  diaryRowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  diaryRowTitle: {
    ...memoryTypography.authorName,
    color: memoryColors.title,
  },
  diaryRowMeta: {
    ...memoryTypography.cardMeta,
    color: memoryColors.muted,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: memoryMetrics.avatarSmall,
    height: memoryMetrics.avatarSmall,
    borderRadius: memoryMetrics.avatarSmall / 2,
    flexShrink: 0,
  },
  avatarWell: {
    backgroundColor: memoryColors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...memoryTypography.eyebrow,
    letterSpacing: 0,
    color: memoryColors.accentDeep,
  },
  authorText: {
    flex: 1,
    gap: 1,
  },
  authorName: {
    ...memoryTypography.authorName,
    color: memoryColors.title,
  },
  authorMeta: {
    ...memoryTypography.cardMeta,
    color: memoryColors.muted,
  },
  handle: {
    ...memoryTypography.cardMeta,
    color: memoryColors.muted,
    marginTop: -6,
    marginLeft: memoryMetrics.avatarSmall + 10,
  },
  pressed: {
    opacity: memoryMotion.pressOpacity,
  },
});
