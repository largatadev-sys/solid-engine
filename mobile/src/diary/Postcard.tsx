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
import { Icon } from '../components/Icon';
import { MediaThumb } from '../media/MediaThumb';
import { spacing } from '../theme';
import {
  profileColors,
  profileMetrics,
  profileTypography,
  workspaceColors,
} from '../theme/workspaceTokens';
import type { DiaryEntryResponse } from '../types/api';
import {
  carouselCounter,
  dayTimeBadge,
  likesLabel,
  pageOfOffset,
  showsCarouselChrome,
} from './postcardCarousel';


interface PostcardProps {
  readonly entry: DiaryEntryResponse;
  readonly onPress: () => void;
  readonly likes?: number | null;
}


export function Postcard({ entry, onPress, likes = null }: PostcardProps) {
  const [page, setPage] = useState(0);
  const [photoWidth, setPhotoWidth] = useState(0);

  const photoCount = entry.photos.length;
  const chrome = showsCarouselChrome(photoCount);

  const measure = (event: LayoutChangeEvent) => setPhotoWidth(event.nativeEvent.layout.width);

  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(pageOfOffset(event.nativeEvent.contentOffset.x, photoWidth, photoCount));

  return (
    <Pressable
      style={styles.postcard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open your entry for ${entry.activityTitle}`}
    >
      <View style={styles.stage} onLayout={measure}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={settle}
          scrollEventThrottle={16}
        >
          {entry.photos.map((photo, index) => (
            <MediaThumb
              key={photo.id}
              url={photo.url}
              full
              style={{ ...styles.photo, width: photoWidth }}
              accessibilityLabel={`${entry.activityTitle}, photo ${index + 1}`}
            />
          ))}
        </ScrollView>

        {chrome && (
          <>
            <View style={styles.counter}>
              <Text style={styles.counterLabel}>{carouselCounter(page, photoCount)}</Text>
            </View>
            <View style={styles.dots}>
              {entry.photos.map((photo, index) => (
                <View key={photo.id} style={index === page ? styles.dotActive : styles.dot} />
              ))}
            </View>
          </>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {entry.activityTitle}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel} numberOfLines={1}>
              {dayTimeBadge(entry)}
            </Text>
          </View>
        </View>

        {entry.caption !== null && <Text style={styles.caption}>{entry.caption}</Text>}

        {likes !== null && (
          <View style={styles.likes}>
            <Icon
              name="heartFilled"
              size={profileMetrics.heartSize}
              color={profileColors.likeHeart}
            />
            <Text style={styles.likesLabel}>{likesLabel(likes)}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  postcard: {
    borderWidth: 1,
    borderColor: profileColors.postcardBorder,
    borderRadius: profileMetrics.postcardRadius,
    overflow: 'hidden',
    backgroundColor: workspaceColors.surface,
  },
  stage: {
    height: profileMetrics.postcardPhotoHeight,
    backgroundColor: profileColors.coverWell,
  },
  photo: {
    height: profileMetrics.postcardPhotoHeight,
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
  body: {
    padding: spacing.sm3,
    gap: spacing.xs2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...profileTypography.postcardTitle,
    color: workspaceColors.title,
    flex: 1,
  },
  badge: {
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: profileColors.badgeWell,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  badgeLabel: {
    ...profileTypography.dayBadge,
    color: profileColors.badgeInk,
  },
  caption: {
    ...profileTypography.caption,
    color: profileColors.bio,
  },
  likes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs2,
  },
  likesLabel: {
    ...profileTypography.likes,
    color: profileColors.likeCount,
  },
});
