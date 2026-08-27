import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { publishedRoute } from '../itineraries/publishedExit';
import { CollapsingRow } from '../removal/CollapsingRow';
import { KebabButton } from '../removal/KebabButton';
import { itineraryMenuLabel } from '../removal/removalCopy';
import { visibleAfterRemoval } from '../removal/removalProjection';
import type { RemovalQueue } from '../removal/useRemovalQueue';
import { MediaThumb } from '../media/MediaThumb';
import { useMyPublishedItineraries } from '../query/profileQueries';
import { useRevalidateOnFocus } from '../query/useRevalidateOnFocus';
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
import { stubPricePerPersonFor, stubRatingFor } from './stubMetrics';


export function ProfileItinerariesTab({ removal }: { readonly removal: RemovalQueue }) {
  const router = useRouter();
  const published = useMyPublishedItineraries();
  const cards = (published.data?.pages ?? []).flatMap((page) => page.items);
  const visible = visibleAfterRemoval(cards, removal.removedIds);

  useRevalidateOnFocus(published);

  if (published.isPending) {
    return <ActivityIndicator style={styles.loading} color={colors.accent} />;
  }

  return (
    <View style={styles.pane}>
      {visible.length === 0 ? (
        <Text style={styles.empty}>{PROFILE_ITINERARIES_EMPTY}</Text>
      ) : (
        <>
          {cards.map((card) => (
            <CollapsingRow
              key={card.id}
              collapsed={removal.isRemoved(card.id)}
              gap={profileMetrics.cardGap}
            >
              <ShowcaseCard
                card={card}
                onPress={() => router.push(publishedRoute('profile', card.id))}
                onOpenMenu={() =>
                  removal.openMenu({
                    id: card.id,
                    kind: 'itinerary',
                    title: card.title,
                    audience: 'public',
                  })
                }
              />
            </CollapsingRow>
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
  onOpenMenu,
}: {
  readonly card: ShowcaseItineraryResponse;
  readonly onPress: () => void;
  readonly onOpenMenu: () => void;
}) {
  const rating = stubRatingFor(card.id);
  const price = pricePillLabel(stubPricePerPersonFor(card.id));
  const meta = showcaseMetaLine(card.destination, card.durationDays);

  return (
    <View style={styles.card}>
      <Pressable
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
        </View>
      </Pressable>

      <View style={styles.footer}>
        <View style={styles.rating}>
          <Icon
            name={rating === null ? 'star' : 'starFilled'}
            size={profileMetrics.starSize}
            color={rating === null ? profileColors.starMuted : profileColors.star}
          />
          {rating !== null && <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>}
        </View>

        <KebabButton
          label={itineraryMenuLabel(card.title)}
          inset="footer"
          onPress={onOpenMenu}
        />
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  pane: {
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.md,
    gap: profileMetrics.cardGap,
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
    paddingHorizontal: spacing.sm3,
    paddingTop: spacing.sm3,
    gap: spacing.xs2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm3,
    paddingBottom: spacing.xs2,
    minHeight: profileMetrics.kebabHit,
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
