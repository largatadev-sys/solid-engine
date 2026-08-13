import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { useDiscoveryBrowse } from '../query/discoveryQueries';
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
import { FilterSheet } from './FilterSheet';
import { publishedItineraryRoute } from './discoveryCardCopy';
import {
  BROWSE_ALL_TITLE,
  CLEAR_FILTERS_LABEL,
  noResultsLine,
  RESULTS_LOAD_FAILED,
  RESULTS_RETRY_LABEL,
  resultCountLine,
  SEARCH_RETRY_ACTION,
  SEARCH_RETRY_BANNER,
} from './discoveryCopy';
import {
  activeFilterGroups,
  clearedOfFilters,
  filtersFromParams,
  type DiscoveryFilters,
} from './discoveryFilters';
import { DISCOVER_TAB_ROUTE, resultsRoute } from './discoveryRoutes';
import { FETCH_AHEAD_CARDS, SKELETON_CARDS } from './resultsPaging';

export function DiscoveryResultsScreen() {
  const params = useLocalSearchParams<{
    q?: string;
    destination?: string;
    duration?: string;
  }>();
  const filters = filtersFromParams(params);
  const [filtering, setFiltering] = useState(false);

  const browse = useDiscoveryBrowse(filters);

  const cards: DiscoveryCardResponse[] =
    browse.data?.pages.flatMap((page) => page.items) ?? [];
  const badge = activeFilterGroups(filters);
  const settled = !browse.isPending && !browse.isFetching;
  const empty = settled && !browse.isError && cards.length === 0;

  function applyFilters(next: DiscoveryFilters) {
    setFiltering(false);
    router.replace(resultsRoute(next));
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={filters.query ?? BROWSE_ALL_TITLE}
        size="heading"
        back
        backTo={DISCOVER_TAB_ROUTE}
      />

      <View style={styles.controls}>
        <Text style={styles.count}>{resultCountLine(cards.length)}</Text>
        <Pressable
          style={[styles.filterButton, badge > 0 && styles.filterButtonActive]}
          onPress={() => setFiltering(true)}
          accessibilityRole="button"
          accessibilityLabel={
            badge === 0
              ? "Filter these results"
              : `Filter these results, ${badge} active`
          }
        >
          <Icon
            name="sliders"
            size={14}
            color={badge > 0 ? colors.accent : workspaceColors.title}
          />
          {badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>{badge}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {browse.isError && cards.length > 0 && (
        <Pressable
          style={styles.banner}
          onPress={() => void browse.refetch()}
          accessibilityRole="button"
          accessibilityLabel={SEARCH_RETRY_ACTION}
        >
          <Text style={styles.bannerLabel}>{SEARCH_RETRY_BANNER}</Text>
          <Text style={styles.bannerAction}>{SEARCH_RETRY_ACTION}</Text>
        </Pressable>
      )}

      {browse.isPending ? (
        <ActivityIndicator style={styles.state} color={colors.accent} />
      ) : empty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{noResultsLine(filters.query)}</Text>
          {activeFilterGroups(filters) > 0 && (
            <Pressable
              onPress={() =>
                router.replace(resultsRoute(clearedOfFilters(filters)))
              }
              accessibilityRole="button"
              accessibilityLabel={CLEAR_FILTERS_LABEL}
            >
              <Text style={styles.clearFilters}>{CLEAR_FILTERS_LABEL}</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(card) => card.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={FETCH_AHEAD_CARDS / Math.max(cards.length, 1)}
          onEndReached={() => {
            if (browse.hasNextPage && !browse.isFetchingNextPage) {
              void browse.fetchNextPage();
            }
          }}
          renderItem={({ item }) => (
            <DiscoveryCard
              card={item}
              onPress={() => router.push(publishedItineraryRoute(item.id))}
            />
          )}
          ListFooterComponent={
            <ResultsFooter
              loading={browse.isFetchingNextPage}
              failed={browse.isError && cards.length > 0}
              onRetry={() => void browse.fetchNextPage()}
            />
          }
        />
      )}

      <FilterSheet
        visible={filtering}
        applied={filters}
        onApply={applyFilters}
        onDismiss={() => setFiltering(false)}
      />
    </View>
  );
}

function ResultsFooter({
  loading,
  failed,
  onRetry,
}: {
  readonly loading: boolean;
  readonly failed: boolean;
  readonly onRetry: () => void;
}) {
  if (failed) {
    return (
      <Pressable
        style={styles.retryRow}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={RESULTS_RETRY_LABEL}
      >
        <Text style={styles.retryLabel}>{RESULTS_LOAD_FAILED}</Text>
        <Text style={styles.retryAction}>{SEARCH_RETRY_ACTION}</Text>
      </Pressable>
    );
  }

  if (!loading) {
    return null;
  }

  return (
    <View style={styles.skeletons}>
      {Array.from({ length: SKELETON_CARDS }, (_unused, index) => (
        <View key={index} style={styles.skeleton} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md2,
    paddingBottom: spacing.sm3,
  },
  count: {
    ...profileTypography.sectionTitle,
    color: workspaceColors.title,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs2,
    paddingHorizontal: spacing.sm3,
    paddingVertical: spacing.sm,
    borderRadius: discoveryMetrics.pillRadius,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    backgroundColor: workspaceColors.surface,
  },
  filterButtonActive: {
    borderColor: colors.accent,
    backgroundColor: workspaceColors.accentWash,
  },
  badge: {
    minWidth: discoveryMetrics.badgeSize,
    height: discoveryMetrics.badgeSize,
    borderRadius: discoveryMetrics.badgeSize / 2,
    paddingHorizontal: 4,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    ...profileTypography.counter,
    color: workspaceColors.onAccent,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md2,
    marginBottom: spacing.sm3,
    paddingHorizontal: spacing.sm3,
    paddingVertical: spacing.sm2,
    borderRadius: spacing.sm2,
    backgroundColor: workspaceColors.accentWash,
  },
  bannerLabel: {
    ...profileTypography.sectionMeta,
    color: profileColors.bio,
  },
  bannerAction: {
    ...profileTypography.sectionMeta,
    fontWeight: '700',
    color: colors.accent,
  },
  state: {
    marginTop: spacing.xl,
  },
  empty: {
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.xl,
    gap: spacing.sm,
    alignItems: 'center',
  },
  emptyTitle: {
    ...profileTypography.sectionTitle,
    color: workspaceColors.title,
    textAlign: 'center',
  },
  clearFilters: {
    ...profileTypography.editPill,
    color: colors.accent,
  },
  list: {
    paddingHorizontal: spacing.md2,
    paddingBottom: spacing.xl,
    gap: profileMetrics.cardGap,
  },
  skeletons: {
    gap: profileMetrics.cardGap,
    paddingTop: profileMetrics.cardGap,
  },
  skeleton: {
    height: profileMetrics.coverHeight,
    borderRadius: profileMetrics.sectionRadius,
    backgroundColor: profileColors.coverWell,
  },
  retryRow: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  retryLabel: {
    ...profileTypography.sectionMeta,
    color: profileColors.meta,
  },
  retryAction: {
    ...profileTypography.editPill,
    color: colors.accent,
  },
});
