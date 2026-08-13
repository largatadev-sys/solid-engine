import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { comingSoon } from '../components/comingSoon';
import { MediaThumb } from '../media/MediaThumb';
import { pricePillLabel } from '../profile/showcaseCard';
import { stubPricePerPersonFor, stubRatingFor } from '../profile/stubMetrics';
import { spacing } from '../theme';
import { profileColors, profileMetrics, profileTypography, workspaceColors } from '../theme/workspaceTokens';
import type { DiscoveryCardResponse } from '../types/api';
import {
  discoveryAuthorLabel,
  discoveryCardAccessibilityLabel,
  discoveryMetaLine,
} from './discoveryCardCopy';


const BOOKMARK_SIZE = 32;

const BOOKMARK_GLYPH = 16;

const AVATAR_SIZE = 22;


export function DiscoveryCard({
  card,
  onPress,
  width,
}: {
  readonly card: DiscoveryCardResponse;
  readonly onPress: () => void;
  readonly width?: number;
}) {
  const rating = stubRatingFor(card.id);
  const price = pricePillLabel(stubPricePerPersonFor(card.id));
  const meta = discoveryMetaLine(card);
  const author = discoveryAuthorLabel(card);

  return (
    <Pressable
      style={[styles.card, width === undefined ? null : { width }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={discoveryCardAccessibilityLabel(card)}
    >
      <View style={styles.cover}>
        <MediaThumb
          url={card.coverImageUrl}
          full
          style={styles.coverImage}
          fallbackStyle={styles.coverWell}
          accessibilityLabel={`Cover photo for ${card.title}`}
          fallback={<View />}
        />
        <Pressable
          style={styles.bookmark}
          onPress={() => comingSoon('saved')}
          accessibilityRole="button"
          accessibilityLabel={`Save ${card.title} to trip ideas`}
        >
          <Icon name="bookmark" size={BOOKMARK_GLYPH} color={workspaceColors.title} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {card.title}
        </Text>

        {meta !== null && (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        )}

        <View style={styles.byline}>
          <View style={styles.avatar}>
            <MediaThumb
              url={card.author.avatarUrl}
              style={styles.avatarImage}
              fallbackStyle={styles.avatarWell}
              accessibilityLabel={`Avatar of ${author}`}
              fallback={<View />}
            />
          </View>

          <Pressable
            style={styles.authorTap}
            onPress={() => comingSoon('profile')}
            accessibilityRole="button"
            accessibilityLabel={`Open the profile of ${author}`}
          >
            <Text style={styles.author} numberOfLines={1}>
              {author}
            </Text>
          </Pressable>

          <View style={styles.rating}>
            <Icon
              name={rating === null ? 'star' : 'starFilled'}
              size={profileMetrics.starSize}
              color={rating === null ? profileColors.starMuted : profileColors.star}
            />
            {rating !== null && <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>}
          </View>

          {price !== null && (
            <Text style={styles.price} numberOfLines={1}>
              {price}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: profileMetrics.sectionRadius,
    overflow: 'hidden',
    backgroundColor: workspaceColors.surface,
  },
  cover: {
    height: profileMetrics.coverHeight,
    backgroundColor: profileColors.coverWell,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverWell: {
    width: '100%',
    height: '100%',
    backgroundColor: profileColors.coverWell,
  },
  bookmark: {
    position: 'absolute',
    top: profileMetrics.pillInset,
    right: profileMetrics.pillInset,
    width: BOOKMARK_SIZE,
    height: BOOKMARK_SIZE,
    borderRadius: BOOKMARK_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.sm2,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm2,
    gap: spacing.xs,
  },
  title: {
    ...profileTypography.cardTitle,
    color: workspaceColors.title,
  },
  meta: {
    ...profileTypography.cardMeta,
    color: profileColors.meta,
  },
  byline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs2,
    paddingTop: spacing.xs,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: profileColors.avatarWell,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarWell: {
    width: '100%',
    height: '100%',
    backgroundColor: profileColors.avatarWell,
  },
  authorTap: {
    flex: 1,
    flexShrink: 1,
  },
  author: {
    ...profileTypography.sectionMeta,
    color: profileColors.bio,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  ratingValue: {
    ...profileTypography.rating,
    color: workspaceColors.title,
  },
  price: {
    ...profileTypography.rating,
    color: workspaceColors.title,
    flexShrink: 0,
  },
});
