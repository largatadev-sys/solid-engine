import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { MediaThumb } from '../media/MediaThumb';
import { useMyPublishedItineraries } from '../query/profileQueries';
import { colors, spacing } from '../theme';
import {
  profileColors,
  profileMetrics,
  profileTypography,
  workspaceColors,
} from '../theme/workspaceTokens';
import type { ShowcaseItineraryResponse } from '../types/api';
import { PROFILE_ITINERARIES_EMPTY, PUBLISHED_BADGE } from './profileCopy';
import { pricePillLabel, showcaseMetaLine } from './showcaseCard';
import { stubPricePerPerson, stubRating } from './stubMetrics';


export function ProfileItinerariesTab() {
  const router = useRouter();
  const published = useMyPublishedItineraries();
  const cards = (published.data?.pages ?? []).flatMap((page) => page.items);

  if (published.isPending) {
    return <ActivityIndicator style={styles.loading} color={colors.accent} />;
  }

  return (
    <View style={styles.pane}>
      {cards.length === 0 ? (
        <Text style={styles.empty}>{PROFILE_ITINERARIES_EMPTY}</Text>
      ) : (
        <>
          {cards.map((card) => (
            <ShowcaseCard
              key={card.id}
              card={card}
              onPress={() => router.push({ pathname: '/published/[id]', params: { id: card.id } })}
            />
          ))}

          {published.hasNextPage === true && (
            <Pressable
              style={styles.more}
              onPress={() => void published.fetchNextPage()}
              accessibilityRole="button"
              accessibilityLabel="Show more published itineraries"
            >
              <Text style={styles.moreLabel}>Show more</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}


function ShowcaseCard({
  card,
  onPress,
}: {
  readonly card: ShowcaseItineraryResponse;
  readonly onPress: () => void;
}) {
  const rating = stubRating();
  const price = pricePillLabel(stubPricePerPerson());
  const meta = showcaseMetaLine(card.destinations, card.durationDays);

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open the published view of ${card.title}`}
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
        {price !== null && (
          <View style={styles.pricePill}>
            <Text style={styles.pricePillLabel} numberOfLines={1}>
              {price}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {card.title}
          </Text>
          <View style={styles.publishedBadge}>
            <Text style={styles.publishedLabel}>{PUBLISHED_BADGE}</Text>
          </View>
        </View>

        {meta !== null && <Text style={styles.meta}>{meta}</Text>}

        <View style={styles.rating}>
          <Icon
            name={rating === null ? 'star' : 'starFilled'}
            size={profileMetrics.starSize}
            color={rating === null ? profileColors.starMuted : profileColors.star}
          />
          {rating !== null && <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>}
        </View>
      </View>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  pane: {
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  loading: {
    marginTop: spacing.lg,
  },
  empty: {
    ...profileTypography.sectionMeta,
    color: profileColors.meta,
  },
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
    height: profileMetrics.coverHeight,
  },
  coverWell: {
    backgroundColor: profileColors.coverWell,
  },
  pricePill: {
    position: 'absolute',
    top: profileMetrics.pillInset,
    right: profileMetrics.pillInset,
    backgroundColor: profileColors.pricePill,
    borderRadius: 999,
    paddingHorizontal: spacing.sm2,
    paddingVertical: 3,
  },
  pricePillLabel: {
    ...profileTypography.pricePill,
    color: profileColors.onPill,
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
    ...profileTypography.cardTitle,
    color: workspaceColors.title,
    flex: 1,
  },
  publishedBadge: {
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: profileColors.publishedWell,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  publishedLabel: {
    ...profileTypography.publishedBadge,
    color: profileColors.publishedInk,
  },
  meta: {
    ...profileTypography.cardMeta,
    color: profileColors.meta,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingValue: {
    ...profileTypography.rating,
    color: workspaceColors.title,
  },
  more: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  moreLabel: {
    ...profileTypography.sectionTitle,
    color: workspaceColors.accent,
  },
});
