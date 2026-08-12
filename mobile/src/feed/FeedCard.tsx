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
import { radii, spacing } from '../theme';
import { feedColors, feedMetrics, feedTypography } from '../theme/workspaceTokens';
import type { FeedPostcardResponse } from '../types/api';
import {
  authorInitials,
  authorName,
  timeSince,
  tripLine,
  tripLineNavigates,
} from './feedCardAnatomy';
import {
  counterLabel,
  dotScale,
  dotWindow,
  loadsPage,
  pageOfOffset,
  showsCarousel,
} from './feedCarousel';
import { FEED_CAPTION_MORE, FEED_TRIP_BADGE } from './feedCopy';
import { dragToScroll, PAGING, SHOW_SCROLLBAR, SNAP_CHILD_STYLE, SNAP_STYLE } from '../diary/photoStripScroll';

const CAPTION_LINES = 2;


interface FeedCardProps {
  readonly card: FeedPostcardResponse;
  readonly now: number;
  readonly page: number;
  readonly onPageChange: (page: number) => void;
  readonly onOpenTrip: (card: FeedPostcardResponse) => void;
  readonly onStubTap: (what: StubControl) => void;
}


export type StubControl = 'comment' | 'share' | 'save' | 'author' | 'photoSheet';


export function FeedCard({
  card,
  now,
  page,
  onPageChange,
  onOpenTrip,
  onStubTap,
}: FeedCardProps) {
  const [photoWidth, setPhotoWidth] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [drag] = useState(dragToScroll);

  const photoCount = card.photos.length;
  const carousel = showsCarousel(photoCount);
  const window = dotWindow(page, photoCount);
  const line = tripLine(card);
  const navigates = tripLineNavigates(card);

  const measure = (event: LayoutChangeEvent) => setPhotoWidth(event.nativeEvent.layout.width);

  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    onPageChange(pageOfOffset(event.nativeEvent.contentOffset.x, photoWidth, photoCount));

  return (
    <View style={styles.card}>
      <View style={styles.authorRow}>
        <Pressable
          style={styles.avatar}
          onPress={() => onStubTap('author')}
          accessibilityRole="button"
          accessibilityLabel={`${authorName(card)}, traveler profile`}
        >
          {card.author.avatarUrl === null ? (
            <Text style={styles.initials}>{authorInitials(card)}</Text>
          ) : (
            <MediaThumb
              url={card.author.avatarUrl}
              style={styles.avatarPhoto}
              accessibilityLabel={`${authorName(card)}'s avatar`}
              fallback={<Text style={styles.initials}>{authorInitials(card)}</Text>}
            />
          )}
        </Pressable>

        <View style={styles.authorText}>
          <Pressable
            style={styles.nameRow}
            onPress={() => onStubTap('author')}
            accessibilityRole="button"
            accessibilityLabel={authorName(card)}
          >
            <Text style={styles.name} numberOfLines={1}>
              {authorName(card)}
            </Text>
            <Text style={styles.timeSince}>{timeSince(card.sharedAt, now)}</Text>
          </Pressable>

          {line !== null &&
            (navigates ? (
              <Pressable
                onPress={() => onOpenTrip(card)}
                accessibilityRole="link"
                accessibilityLabel={`${line}, open the published trip`}
              >
                <Text style={styles.tripLine} numberOfLines={1}>
                  {line}
                </Text>
              </Pressable>
            ) : (
              <Text style={[styles.tripLine, styles.tripLineInert]} numberOfLines={1}>
                {line}
              </Text>
            ))}
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>{FEED_TRIP_BADGE}</Text>
        </View>
      </View>

      <View style={styles.stage} onLayout={measure}>
        <ScrollView
          horizontal
          {...PAGING}
          style={SNAP_STYLE}
          showsHorizontalScrollIndicator={SHOW_SCROLLBAR}
          onScroll={settle}
          onMomentumScrollEnd={settle}
          scrollEventThrottle={16}
          {...drag}
        >
          {card.photos.map((photo, index) => (
            <View
              key={photo.id}
              style={{ ...styles.slide, ...SNAP_CHILD_STYLE, width: photoWidth }}
            >
              {loadsPage(index, page) ? (
                <MediaThumb
                  url={photo.url}
                  full
                  style={styles.photo}
                  accessibilityLabel={`${card.activityTitle}, photo ${index + 1}`}
                  fallback={<View style={styles.photoWell} />}
                />
              ) : (
                <View style={styles.photoWell} />
              )}
            </View>
          ))}
        </ScrollView>

        {carousel && (
          <>
            <View style={styles.counter} pointerEvents="none">
              <Text style={styles.counterLabel}>{counterLabel(page, photoCount)}</Text>
            </View>

            <View style={styles.dots} pointerEvents="none">
              {window.map((dot) => (
                <View
                  key={dot}
                  style={[
                    styles.dot,
                    {
                      opacity: dot === page ? 1 : 0.5,
                      transform: [{ scale: dotScale(dot, page, window, photoCount) }],
                    },
                  ]}
                />
              ))}
            </View>
          </>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Icon name="mapPin" size={feedMetrics.tagGlyph} color={feedColors.tagInk} />
            <Text style={styles.tagLabel} numberOfLines={1}>
              {card.activityTitle}
            </Text>
          </View>
        </View>

        {card.caption !== null && (
          <View>
            <Text style={styles.caption} numberOfLines={expanded ? undefined : CAPTION_LINES}>
              {card.caption}
            </Text>
            {!expanded && (
              <Pressable
                onPress={() => setExpanded(true)}
                accessibilityRole="button"
                accessibilityLabel={`Read the rest of ${authorName(card)}'s caption`}
              >
                <Text style={styles.captionMore}>{FEED_CAPTION_MORE}</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.engagement}>
          <View style={styles.spacer} />

          <Pressable
            style={styles.action}
            onPress={() => onStubTap('share')}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Share this postcard"
          >
            <Icon name="share" size={feedMetrics.actionGlyph} color={feedColors.glyphIdle} />
          </Pressable>

          <Pressable
            style={styles.actionLast}
            onPress={() => onStubTap('save')}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Save this postcard"
          >
            <Icon name="bookmark" size={feedMetrics.saveGlyph} color={feedColors.glyphIdle} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}


const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };


const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: feedColors.cardBorder,
    borderRadius: feedMetrics.cardRadius,
    backgroundColor: feedColors.cardSurface,
    overflow: 'hidden',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    padding: feedMetrics.cardPadding,
  },
  avatar: {
    width: feedMetrics.avatarSize,
    height: feedMetrics.avatarSize,
    borderRadius: radii.pill,
    backgroundColor: feedColors.photoWell,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarPhoto: {
    width: feedMetrics.avatarSize,
    height: feedMetrics.avatarSize,
  },
  initials: {
    ...feedTypography.avatarInitials,
    color: feedColors.countIdle,
  },
  authorText: {
    flex: 1,
    gap: spacing.hair,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs2,
  },
  name: {
    ...feedTypography.authorName,
    color: feedColors.authorName,
    flexShrink: 1,
  },
  timeSince: {
    ...feedTypography.timeSince,
    color: feedColors.timeSince,
    flexShrink: 0,
  },
  tripLine: {
    ...feedTypography.tripLine,
    color: feedColors.tripLine,
  },
  tripLineInert: {
    color: feedColors.tripLineInert,
  },
  badge: {
    flexShrink: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: feedMetrics.chipPaddingY,
    backgroundColor: feedColors.badgeWell,
    borderWidth: 1,
    borderColor: feedColors.badgeBorder,
    borderRadius: feedMetrics.chipRadius,
  },
  badgeLabel: {
    ...feedTypography.badge,
    color: feedColors.badgeInk,
  },
  stage: {
    height: feedMetrics.photoHeight,
    backgroundColor: feedColors.photoWell,
  },
  slide: {
    height: feedMetrics.photoHeight,
  },
  photo: {
    width: '100%',
    height: feedMetrics.photoHeight,
  },
  photoWell: {
    width: '100%',
    height: feedMetrics.photoHeight,
    backgroundColor: feedColors.photoWell,
  },
  counter: {
    position: 'absolute',
    top: feedMetrics.pillInset,
    right: feedMetrics.pillInset,
    backgroundColor: feedColors.counterPill,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm2,
    paddingVertical: spacing.xs2,
  },
  counterLabel: {
    ...feedTypography.counter,
    color: feedColors.onPill,
  },
  dots: {
    position: 'absolute',
    bottom: feedMetrics.pillInset,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs2,
  },
  dot: {
    width: feedMetrics.dotSize,
    height: feedMetrics.dotSize,
    borderRadius: radii.pill,
    backgroundColor: feedColors.onPill,
  },
  body: {
    padding: feedMetrics.cardPadding,
    gap: spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs2,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: feedMetrics.chipPaddingY,
    backgroundColor: feedColors.tagWell,
    borderRadius: feedMetrics.chipRadius,
    maxWidth: '100%',
  },
  tagLabel: {
    ...feedTypography.tag,
    color: feedColors.tagInk,
    flexShrink: 1,
  },
  caption: {
    ...feedTypography.caption,
    color: feedColors.caption,
  },
  captionMore: {
    ...feedTypography.captionMore,
    color: feedColors.captionMore,
  },
  engagement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  spacer: {
    flex: 1,
  },
  action: {
    paddingVertical: spacing.xs2,
    paddingHorizontal: spacing.sm,
  },
  actionLast: {
    paddingVertical: spacing.xs2,
    paddingLeft: spacing.sm,
  },
});
