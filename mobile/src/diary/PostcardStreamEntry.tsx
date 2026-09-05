import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { MediaThumb } from '../media/MediaThumb';
import { spacing } from '../theme';
import {
  diaryScreenColors,
  diaryScreenMetrics,
  diaryScreenTypography,
  profileColors,
  profileMetrics,
  profileTypography,
} from '../theme/workspaceTokens';
import type { DiaryPhotoResponse } from '../types/api';
import {
  dragToScroll,
  PAGING,
  SHOW_SCROLLBAR,
  SNAP_CHILD_STYLE,
  SNAP_STYLE,
} from '../components/stripScroll';
import { carouselCounter, pageOfOffset, showsCarouselChrome } from './postcardCarousel';
import { LocationTag } from '../places/LocationTag';


type StreamPostcard = {
  readonly id: string;
  readonly activityTitle: string;
  readonly caption: string | null;
  readonly place?: string | null;
  readonly photos: readonly DiaryPhotoResponse[];
};


export function PostcardStreamEntry({
  postcard,
  eyebrow,
  openLabel,
  destination,
  onOpen,
}: {
  readonly postcard: StreamPostcard;
  readonly eyebrow: string;
  readonly openLabel: string;
  readonly destination?: string | null;
  readonly onOpen: () => void;
}) {
  const [drag] = useState(dragToScroll);
  const [photoWidth, setPhotoWidth] = useState(0);
  const [page, setPage] = useState(0);

  const photoCount = postcard.photos.length;
  const chrome = showsCarouselChrome(photoCount);

  const measure = (event: LayoutChangeEvent) => setPhotoWidth(event.nativeEvent.layout.width);

  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(pageOfOffset(event.nativeEvent.contentOffset.x, photoWidth, photoCount));

  return (
    <View style={styles.entry}>
      <Pressable
        style={styles.heading}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={openLabel}
      >
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.entryTitle}>{postcard.activityTitle}</Text>
      </Pressable>

      <LocationTag place={postcard.place ?? null} destination={destination ?? null} />

      <View style={styles.stage}>
        <ScrollView
          horizontal
          {...PAGING}
          style={SNAP_STYLE}
          showsHorizontalScrollIndicator={SHOW_SCROLLBAR}
          onLayout={measure}
          onScroll={settle}
          onMomentumScrollEnd={settle}
          scrollEventThrottle={16}
          {...drag}
        >
          {postcard.photos.map((photo, index) => (
            <MediaThumb
              key={photo.id}
              url={photo.url}
              full
              style={{ ...styles.photo, ...SNAP_CHILD_STYLE, width: photoWidth }}
              accessibilityLabel={`${postcard.activityTitle}, photo ${index + 1}`}
            />
          ))}
        </ScrollView>

        {chrome && (
          <>
            <View style={styles.counter}>
              <Text style={styles.counterLabel}>{carouselCounter(page, photoCount)}</Text>
            </View>
            <View style={styles.dots}>
              {postcard.photos.map((photo, index) => (
                <View key={photo.id} style={index === page ? styles.dotActive : styles.dot} />
              ))}
            </View>
          </>
        )}
      </View>

      {postcard.caption !== null && (
        <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={openLabel}>
          <Text style={styles.caption}>{postcard.caption}</Text>
        </Pressable>
      )}
    </View>
  );
}


export const STREAM_INSET = spacing.md2;

const styles = StyleSheet.create({
  entry: {
    gap: spacing.sm,
    paddingHorizontal: STREAM_INSET,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: diaryScreenColors.divider,
  },
  heading: {
    gap: spacing.sm,
  },
  eyebrow: {
    ...diaryScreenTypography.eyebrow,
    color: diaryScreenColors.eyebrow,
  },
  entryTitle: {
    ...diaryScreenTypography.entryTitle,
    color: diaryScreenColors.caption,
  },
  stage: {
    marginHorizontal: -STREAM_INSET,
  },
  photo: {
    height: diaryScreenMetrics.streamPhotoHeight,
    backgroundColor: diaryScreenColors.photoWell,
  },
  counter: {
    position: 'absolute',
    top: profileMetrics.pillInset,
    right: profileMetrics.pillInset,
    backgroundColor: profileColors.counterPill,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  counterLabel: {
    ...profileTypography.counter,
    color: profileColors.onPill,
  },
  dots: {
    position: 'absolute',
    bottom: profileMetrics.pillInset,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: profileMetrics.dotSize,
    height: profileMetrics.dotSize,
    borderRadius: profileMetrics.dotSize / 2,
    backgroundColor: profileColors.dotIdle,
  },
  dotActive: {
    width: profileMetrics.dotSize,
    height: profileMetrics.dotSize,
    borderRadius: profileMetrics.dotSize / 2,
    backgroundColor: profileColors.dotActive,
  },
  caption: {
    ...diaryScreenTypography.caption,
    color: diaryScreenColors.caption,
  },
});
