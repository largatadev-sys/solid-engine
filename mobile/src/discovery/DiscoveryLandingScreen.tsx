import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import {
  useRecommended,
  useTrendingDestinations,
} from '../query/discoveryQueries';
import { useRevalidateOnFocus } from '../query/useRevalidateOnFocus';
import { useTabRetap } from '../navigation/useTabRetap';
import { CAUGHT_UP_TOAST } from '../feed/feedCopy';
import { atTop } from '../feed/headerVisibility';
import { RETAP_SCROLL_THROTTLE_MS } from '../navigation/retapScroll';
import { SCROLL_TO_TOP_ANIMATED } from '../navigation/scrollToTop';
import { FeedToast } from '../feed/FeedToast';
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
import { RecommendedRail } from './RecommendedRail';
import { TrendingRail } from './TrendingRail';
import { publishedItineraryRoute } from './discoveryCardCopy';
import { NO_FILTERS } from './discoveryFilters';
import {
  LANDING_EMPTY_BODY,
  LANDING_EMPTY_TITLE,
  SEARCH_PLACEHOLDER,
} from './discoveryCopy';
import { DISCOVER_TAB_ROUTE, DISCOVERY_SEARCH_ROUTE, resultsRoute } from './discoveryRoutes';

export function DiscoveryLandingScreen() {
  const recommended = useRecommended();
  const trending = useTrendingDestinations();
  const insets = useSafeAreaInsets();

  useRevalidateOnFocus(recommended);
  useRevalidateOnFocus(trending);

  const scroll = useRef<ScrollView | null>(null);
  const offset = useRef(0);
  const [toast, setToast] = useState<string | null>(null);

  useTabRetap(
    DISCOVER_TAB_ROUTE,
    useCallback(() => {
      if (atTop(offset.current)) {
        void recommended.refetch();
        void trending.refetch();
        setToast(CAUGHT_UP_TOAST);
        return;
      }
      offset.current = 0;
      scroll.current?.scrollTo({ y: 0, animated: SCROLL_TO_TOP_ANIMATED });
    }, [recommended, trending]),
  );

  const cards = recommended.data ?? [];
  const destinations = trending.data ?? [];
  const bothSettled = !recommended.isPending && !trending.isPending;
  const neitherFailed = !recommended.isError && !trending.isError;
  const nothingAnywhere =
    bothSettled &&
    neitherFailed &&
    cards.length === 0 &&
    destinations.length === 0;

  function openCard(card: DiscoveryCardResponse) {
    router.push(publishedItineraryRoute(card.id));
  }

  function browseAll() {
    router.push(resultsRoute(NO_FILTERS));
  }

  function browseDestination(destination: string) {
    router.push(resultsRoute({ query: null, destination, duration: null }));
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scroll}
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.sm3 },
        ]}
        onScroll={(event) => {
          offset.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={RETAP_SCROLL_THROTTLE_MS}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchRow}>
          <Pressable
            style={styles.searchBar}
            onPress={() => router.push(DISCOVERY_SEARCH_ROUTE)}
            accessibilityRole="button"
            accessibilityLabel={SEARCH_PLACEHOLDER}
          >
            <Icon name="search" size={18} color={profileColors.meta} />
            <Text style={styles.searchLabel}>{SEARCH_PLACEHOLDER}</Text>
          </Pressable>
        </View>

        {nothingAnywhere ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{LANDING_EMPTY_TITLE}</Text>
            <Text style={styles.emptyBody}>{LANDING_EMPTY_BODY}</Text>
          </View>
        ) : (
          <>
            <TrendingRail
              destinations={destinations}
              loading={trending.isPending}
              failed={trending.isError}
              onRetry={() => void trending.refetch()}
              onOpen={browseDestination}
            />

            <RecommendedRail
              cards={cards}
              loading={recommended.isPending}
              failed={recommended.isError}
              onRetry={() => void recommended.refetch()}
              onOpenCard={openCard}
              onSeeAll={browseAll}
            />
          </>
        )}
      </ScrollView>

      <FeedToast message={toast} onDone={() => setToast(null)} />
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: spacing.sm3,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  searchRow: {
    paddingHorizontal: spacing.md2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm3,
    paddingHorizontal: spacing.md,
    paddingVertical: discoveryMetrics.searchBarPadding,
    backgroundColor: workspaceColors.pressed,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: profileMetrics.statsRadius,
  },
  searchLabel: {
    ...discoveryTypography.searchField,
    color: profileColors.meta,
  },
  empty: {
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.xxl,
    gap: spacing.sm,
    alignItems: 'center',
  },
  emptyTitle: {
    ...profileTypography.sectionTitle,
    color: workspaceColors.title,
  },
  emptyBody: {
    ...profileTypography.sectionMeta,
    color: profileColors.meta,
    textAlign: 'center',
  },
});
