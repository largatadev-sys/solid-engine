import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { useSafeBack } from '../navigation/safeBack';
import { RowEntrance } from '../members/RowEntrance';
import { PersonRow } from '../profile/PersonRow';
import { PEOPLE_GROUP_LABEL, SEE_ALL_PEOPLE_LABEL } from '../profile/publicProfileCopy';
import { peopleResultsRoute, publicProfileRoute } from '../profile/travelerRoutes';
import {
  useDiscoveryBrowse,
  useDiscoveryCount,
  usePeopleSearch,
} from '../query/discoveryQueries';
import { colors, spacing } from '../theme';
import {
  discoveryColors,
  discoveryMetrics,
  discoveryTypography,
  followColors,
  followMetrics,
  followTypography,
  profileColors,
  profileMetrics,
  profileTypography,
  publicProfileMotion,
  workspaceColors,
} from '../theme/workspaceTokens';
import type { DiscoveryCardResponse, TravelerCardResponse } from '../types/api';
import { cappedPeople, combinedCountLine, showsPeopleGroup } from './combinedResults';
import { DiscoveryCard } from './DiscoveryCard';
import { FilterSheet } from './FilterSheet';
import { publishedItineraryRoute } from './discoveryCardCopy';
import {
  BROWSE_ALL_TITLE,
  CLEAR_FILTERS_LABEL,
  noResultsLine,
  noTripsMatchTitle,
  NO_TRIPS_SUPPORT,
  RESULTS_LOAD_FAILED,
  RESULTS_RETRY_LABEL,
  SEARCH_BACK_LABEL,
  SEARCH_PLACEHOLDER,
  resultCountLine,
  SEARCH_RETRY_ACTION,
  SEARCH_RETRY_BANNER,
  TRIPS_GROUP_LABEL,
} from './discoveryCopy';
import {
  activeFilterGroups,
  clearedOfFilters,
  filtersFromParams,
  type DiscoveryFilters,
} from './discoveryFilters';
import {
  DISCOVER_TAB_ROUTE,
  DISCOVERY_SEARCH_ROUTE,
  resultsRoute,
} from './discoveryRoutes';
import { fetchesMore, SKELETON_CARDS } from './resultsPaging';

const VIEWABILITY = { itemVisiblePercentThreshold: 10 };


export function DiscoveryResultsScreen() {
  const params = useLocalSearchParams<{
    q?: string;
    destination?: string;
    duration?: string;
  }>();
  const filters = useMemo(
    () => filtersFromParams(params),
    [params.q, params.destination, params.duration],
  );
  const [filtering, setFiltering] = useState(false);
  const insets = useSafeAreaInsets();
  const goBack = useSafeBack(DISCOVER_TAB_ROUTE);

  const browse = useDiscoveryBrowse(filters);
  const matched = useDiscoveryCount(filters, true);
  const people = usePeopleSearch(filters.query ?? '');

  const peopleRows = (people.data?.pages ?? []).flatMap((page) => page.items);
  const peopleMatched = people.data?.pages[0]?.totalCount ?? peopleRows.length;

  const cards: DiscoveryCardResponse[] =
    browse.data?.pages.flatMap((page) => page.items) ?? [];
  const badge = activeFilterGroups(filters);
  const settled = !browse.isPending && !browse.isFetching;
  const noTrips = settled && !browse.isError && cards.length === 0;
  const tripsMatched = matched.isSuccess ? matched.data.count : cards.length;
  const showsPeople = filters.query !== null && showsPeopleGroup(peopleMatched);
  const empty = noTrips && !showsPeople;

  const loaded = useRef({ count: 0, more: false, busy: false, loadMore: () => {} });
  loaded.current = {
    count: cards.length,
    more: browse.hasNextPage === true,
    busy: browse.isFetchingNextPage,
    loadMore: () => void browse.fetchNextPage(),
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const deepest = viewableItems.reduce(
        (furthest, item) => Math.max(furthest, item.index ?? 0),
        0,
      );
      if (fetchesMore(deepest, loaded.current.count, loaded.current.more, loaded.current.busy)) {
        loaded.current.loadMore();
      }
    },
  ).current;

  function applyFilters(next: DiscoveryFilters) {
    setFiltering(false);
    router.replace(resultsRoute(next));
  }

  return (
    <View style={styles.screen}>
      {filters.query === null ? (
        <ScreenHeader title={BROWSE_ALL_TITLE} size="heading" back backTo={DISCOVER_TAB_ROUTE} />
      ) : (
        <View style={[styles.headerRow, { paddingTop: insets.top }]}>
          <Pressable
            style={styles.back}
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel={SEARCH_BACK_LABEL}
          >
            <Icon name="back" size={20} color={workspaceColors.title} />
          </Pressable>
          <Pressable
            style={styles.field}
            onPress={() => router.push(DISCOVERY_SEARCH_ROUTE)}
            accessibilityRole="button"
            accessibilityLabel={`Edit the search for ${filters.query}`}
          >
            <Icon name="search" size={16} color={profileColors.meta} />
            <Text style={styles.query} numberOfLines={1}>
              {filters.query}
            </Text>
          </Pressable>
        </View>
      )}

      {filters.query === null && (
        <View style={styles.searchRow}>
          <Pressable
            style={styles.searchBar}
            onPress={() => router.push(DISCOVERY_SEARCH_ROUTE)}
            accessibilityRole="button"
            accessibilityLabel={SEARCH_PLACEHOLDER}
          >
            <Icon name="search" size={16} color={profileColors.meta} />
            <Text style={styles.searchLabel} numberOfLines={1}>
              {SEARCH_PLACEHOLDER}
            </Text>
          </Pressable>
        </View>
      )}

      <View style={styles.controls}>
        <Text style={filters.query === null ? styles.count : styles.countLine}>
          {filters.query === null
            ? resultCountLine(tripsMatched)
            : combinedCountLine(peopleMatched, tripsMatched)}
        </Text>
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
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY}
          ListHeaderComponent={
            showsPeople ? (
              <PeopleGroup
                people={cappedPeople(peopleRows)}
                onOpenPerson={(handle) => router.push(publicProfileRoute(handle))}
                onSeeAll={() => router.push(peopleResultsRoute(filters.query ?? ''))}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <DiscoveryCard
              card={item}
              onPress={() => router.push(publishedItineraryRoute(item.id))}
            />
          )}
          ListEmptyComponent={
            noTrips ? (
              <View style={styles.noTrips}>
                <View style={styles.noTripsCircle}>
                  <Icon
                    name="search"
                    size={followMetrics.emptyGlyph}
                    color={workspaceColors.accent}
                  />
                </View>
                <Text style={styles.emptyTitle}>
                  {noTripsMatchTitle(filters.query ?? '')}
                </Text>
                <Text style={styles.noTripsBody}>{NO_TRIPS_SUPPORT}</Text>
              </View>
            ) : null
          }
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

function PeopleGroup({
  people,
  onOpenPerson,
  onSeeAll,
}: {
  readonly people: readonly TravelerCardResponse[];
  readonly onOpenPerson: (handle: string) => void;
  readonly onSeeAll: () => void;
}) {
  return (
    <View style={styles.peopleGroup}>
      <Text style={styles.groupLabel}>{PEOPLE_GROUP_LABEL.toUpperCase()}</Text>
      {people.map((person, index) => (
        <RowEntrance
          key={person.id}
          replayKey={person.id}
          durationMs={publicProfileMotion.resultRiseMs}
          risePx={publicProfileMotion.resultRisePx}
          delayMs={index * publicProfileMotion.resultStepMs}
        >
          <PersonRow
            person={person}
            compact
            onPress={() => {
              if (person.handle !== null) onOpenPerson(person.handle);
            }}
          />
        </RowEntrance>
      ))}
      <Pressable
        style={styles.seeAllPeople}
        onPress={onSeeAll}
        accessibilityRole="button"
        accessibilityLabel={SEE_ALL_PEOPLE_LABEL}
      >
        <View style={styles.seeAllCircle}>
          <Icon name="chevronRight" size={followMetrics.seeAllGlyph} color={profileColors.meta} />
        </View>
        <Text style={styles.seeAllLabel}>{SEE_ALL_PEOPLE_LABEL}</Text>
      </Pressable>

      <View style={styles.groupDivider} />
      <Text style={styles.groupLabel}>{TRIPS_GROUP_LABEL.toUpperCase()}</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    paddingHorizontal: spacing.md2,
    paddingBottom: spacing.sm2,
  },
  back: {
    width: discoveryMetrics.backButton,
    height: discoveryMetrics.backButton,
    borderRadius: discoveryMetrics.backButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm3,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm3,
    backgroundColor: workspaceColors.pressed,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: profileMetrics.statsRadius,
  },
  query: {
    flex: 1,
    ...discoveryTypography.searchField,
    color: workspaceColors.title,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    paddingHorizontal: spacing.md2,
    paddingBottom: spacing.sm3,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    paddingHorizontal: spacing.sm3,
    paddingVertical: spacing.sm2,
    backgroundColor: workspaceColors.pressed,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: profileMetrics.statsRadius,
  },
  searchLabel: {
    ...discoveryTypography.searchField,
    color: workspaceColors.title,
    flex: 1,
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
  countLine: {
    ...profileTypography.countLine,
    color: profileColors.meta,
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
  peopleGroup: {
    gap: spacing.xs,
  },
  groupLabel: {
    ...followTypography.groupLabel,
    color: profileColors.chevron,
  },
  seeAllPeople: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    paddingVertical: spacing.sm,
  },
  seeAllCircle: {
    width: followMetrics.seeAllCircle,
    height: followMetrics.seeAllCircle,
    borderRadius: followMetrics.seeAllCircle / 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: followColors.rowChevron,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllLabel: {
    ...followTypography.seeAll,
    color: profileColors.badgeInk,
  },
  groupDivider: {
    height: 1,
    backgroundColor: profileColors.cellDivider,
    marginVertical: spacing.sm,
  },
  noTrips: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    alignItems: 'center',
    gap: spacing.sm2,
  },
  noTripsCircle: {
    width: followMetrics.emptyCircle,
    height: followMetrics.emptyCircle,
    borderRadius: followMetrics.emptyCircle / 2,
    backgroundColor: profileColors.emptyWell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noTripsBody: {
    ...profileTypography.emptyBody,
    color: profileColors.meta,
    textAlign: 'center',
    maxWidth: profileMetrics.noResultsBodyWidth,
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
