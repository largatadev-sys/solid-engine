import { useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { dotScale, dotWindow, pageOfOffset } from '../feed/feedCarousel';
import { colors, spacing } from '../theme';
import {
  discoveryColors,
  discoveryMetrics,
  discoveryTypography,
  profileColors,
  profileMetrics,
  profileTypography,
  workspaceColors,
} from '../theme/workspaceTokens';
import type { DiscoveryCardResponse } from '../types/api';
import { DiscoveryCard } from './DiscoveryCard';
import { showsSeeAllCard } from './discoveryCardCopy';
import { railCardWidth, railPageCount, railPitch } from './railGeometry';
import {
  RECOMMENDED_SECTION_TITLE,
  SECTION_FAILED,
  SECTION_RETRY_LABEL,
  SEE_ALL_CARD_LABEL,
  SEE_ALL_LABEL,
} from './discoveryCopy';

export function RecommendedRail({
  cards,
  loading,
  failed,
  onRetry,
  onOpenCard,
  onSeeAll,
}: {
  readonly cards: readonly DiscoveryCardResponse[];
  readonly loading: boolean;
  readonly failed: boolean;
  readonly onRetry: () => void;
  readonly onOpenCard: (card: DiscoveryCardResponse) => void;
  readonly onSeeAll: () => void;
}) {
  const [railWidth, setRailWidth] = useState(0);
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollView>(null);

  const cardWidth =
    railWidth === 0
      ? 0
      : railCardWidth(railWidth, spacing.md2, discoveryMetrics.recommendedPeek);
  const pitch = railPitch(cardWidth, spacing.sm3);
  const pageCount = railPageCount(cards.length, showsSeeAllCard(cards.length));
  const dots = dotWindow(page, pageCount);

  if (!loading && !failed && cards.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{RECOMMENDED_SECTION_TITLE}</Text>
        {cards.length > 0 && (
          <Pressable
            onPress={onSeeAll}
            accessibilityRole="button"
            accessibilityLabel={SEE_ALL_CARD_LABEL}
          >
            <Text style={styles.seeAll}>{SEE_ALL_LABEL}</Text>
          </Pressable>
        )}
      </View>

      {loading && (
        <ActivityIndicator style={styles.state} color={colors.accent} />
      )}

      {failed && (
        <Pressable
          style={styles.state}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={SECTION_RETRY_LABEL}
        >
          <Text style={styles.failed}>{SECTION_FAILED}</Text>
        </Pressable>
      )}

      {!loading && !failed && (
        <>
          <ScrollView
            ref={scroller}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={pitch > 0 ? pitch : undefined}
            snapToAlignment="start"
            contentContainerStyle={styles.strip}
            onLayout={(event: LayoutChangeEvent) =>
              setRailWidth(event.nativeEvent.layout.width)
            }
            onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) =>
              setPage(
                pageOfOffset(
                  event.nativeEvent.contentOffset.x,
                  pitch,
                  pageCount,
                ),
              )
            }
            scrollEventThrottle={16}
          >
            {cards.map((card) => (
              <DiscoveryCard
                key={card.id}
                card={card}
                width={cardWidth > 0 ? cardWidth : undefined}
                onPress={() => onOpenCard(card)}
              />
            ))}

            {showsSeeAllCard(cards.length) && (
              <Pressable
                style={[
                  styles.seeAllCard,
                  cardWidth > 0 ? { width: cardWidth } : null,
                ]}
                onPress={onSeeAll}
                accessibilityRole="button"
                accessibilityLabel={SEE_ALL_CARD_LABEL}
              >
                <Icon name="search" size={22} color={colors.accent} />
                <Text style={styles.seeAllCardLabel}>{SEE_ALL_CARD_LABEL}</Text>
              </Pressable>
            )}
          </ScrollView>

          {pageCount > 1 && (
            <View style={styles.dots}>
              {dots.map((dot) => (
                <View
                  key={dot}
                  style={[
                    styles.dot,
                    {
                      transform: [
                        { scale: dotScale(dot, page, dots, pageCount) },
                      ],
                      backgroundColor:
                        dot === page ? colors.accent : profileColors.starMuted,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md2,
  },
  title: {
    ...discoveryTypography.railTitle,
    color: workspaceColors.title,
  },
  seeAll: {
    ...profileTypography.editPill,
    color: colors.accent,
  },
  state: {
    paddingHorizontal: spacing.md2,
    paddingVertical: spacing.md,
  },
  failed: {
    ...profileTypography.sectionMeta,
    color: profileColors.meta,
  },
  strip: {
    paddingHorizontal: spacing.md2,
    gap: spacing.sm3,
  },
  seeAllCard: {
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: profileMetrics.sectionRadius,
    backgroundColor: workspaceColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  seeAllCardLabel: {
    ...profileTypography.sectionTitle,
    color: colors.accent,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs2,
  },
  dot: {
    width: discoveryMetrics.railDotSize,
    height: discoveryMetrics.railDotSize,
    borderRadius: discoveryMetrics.railDotSize / 2,
  },
});
