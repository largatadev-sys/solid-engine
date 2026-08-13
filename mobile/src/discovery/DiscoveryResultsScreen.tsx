import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { useDiscoveryBrowse } from '../query/discoveryQueries';
import { colors, spacing } from '../theme';
import { profileColors, profileMetrics, profileTypography, workspaceColors } from '../theme/workspaceTokens';
import type { DiscoveryCardResponse } from '../types/api';
import { DiscoveryCard } from './DiscoveryCard';
import { publishedItineraryRoute } from './discoveryCardCopy';
import {
  BROWSE_ALL_TITLE,
  RESULTS_LOAD_FAILED,
  RESULTS_RETRY_LABEL,
  resultCountLine,
} from './discoveryCopy';
import { DISCOVER_TAB_ROUTE } from './discoveryRoutes';
import { FETCH_AHEAD_CARDS, SKELETON_CARDS } from './resultsPaging';


export function DiscoveryResultsScreen() {
  const browse = useDiscoveryBrowse();

  const cards: DiscoveryCardResponse[] =
    browse.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <View style={styles.screen}>
      <ScreenHeader title={BROWSE_ALL_TITLE} size="heading" back backTo={DISCOVER_TAB_ROUTE} />

      {browse.isPending ? (
        <ActivityIndicator style={styles.state} color={colors.accent} />
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
          ListHeaderComponent={
            <Text style={styles.count}>{resultCountLine(cards.length)}</Text>
          }
          renderItem={({ item }) => (
            <DiscoveryCard card={item} onPress={() => router.push(publishedItineraryRoute(item.id))} />
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
        <Text style={styles.retryAction}>Retry</Text>
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
  state: {
    marginTop: spacing.xl,
  },
  list: {
    paddingHorizontal: spacing.md2,
    paddingBottom: spacing.xl,
    gap: profileMetrics.cardGap,
  },
  count: {
    ...profileTypography.sectionTitle,
    color: workspaceColors.title,
    paddingBottom: spacing.xs,
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
