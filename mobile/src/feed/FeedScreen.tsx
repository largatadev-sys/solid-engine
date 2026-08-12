import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { comingSoon } from '../components/comingSoon';
import { colors, spacing } from '../theme';
import { feedColors, feedMetrics } from '../theme/workspaceTokens';
import type { FeedPostcardResponse } from '../types/api';
import { useFeed } from '../query/feedQueries';
import { FeedCard, type StubControl } from './FeedCard';
import { FeedHeader } from './FeedHeader';
import { FeedEmptyState, FeedRetryRow, FeedSkeletonCard, FeedTerminalCard } from './FeedStates';

const SKELETON_CARDS = 2;


export function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const feed = useFeed();
  const [now, setNow] = useState(() => Date.now());
  const pages = useRef(new Map<string, number>());
  const [, redrawPages] = useState(0);

  const cards = (feed.data?.pages ?? []).flatMap((page) => page.items);

  const pageOf = (cardId: string) => pages.current.get(cardId) ?? 0;

  const rememberPage = useCallback((cardId: string, page: number) => {
    if (pages.current.get(cardId) === page) {
      return;
    }
    pages.current.set(cardId, page);
    redrawPages((tick) => tick + 1);
  }, []);

  const openTrip = (card: FeedPostcardResponse) => {
    if (card.publishedItineraryId === null) {
      return;
    }
    router.push({
      pathname: '/feed/published/[id]',
      params: { id: card.publishedItineraryId },
    });
  };

  const refuse = (what: StubControl) => {
    if (what === 'author') comingSoon('profile');
    else if (what === 'comment') comingSoon('comments');
    else if (what === 'share') comingSoon('share');
    else if (what === 'save') comingSoon('saved');
    else comingSoon('report');
  };

  const refresh = () => {
    setNow(Date.now());
    void feed.refetch();
  };

  const reachedTheEnd = () => {
    if (feed.hasNextPage === true && !feed.isFetchingNextPage) {
      void feed.fetchNextPage();
    }
  };

  if (feed.isPending) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <FeedHeader
          onSearch={() => comingSoon('search')}
          onNotifications={() => comingSoon('notifications')}
        />
        <View style={styles.list}>
          <FeedSkeletonCard />
          <FeedSkeletonCard />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <FeedHeader
        onSearch={() => comingSoon('search')}
        onNotifications={() => comingSoon('notifications')}
      />

      <FlatList
        data={cards}
        keyExtractor={(card) => card.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <FeedCard
            card={item}
            now={now}
            page={pageOf(item.id)}
            onPageChange={(page) => rememberPage(item.id, page)}
            onOpenTrip={openTrip}
            onStubTap={refuse}
          />
        )}
        onEndReached={reachedTheEnd}
        onEndReachedThreshold={feedMetrics.prefetchThreshold}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching && !feed.isFetchingNextPage}
            onRefresh={refresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={<FeedEmptyState />}
        ListFooterComponent={
          <FeedFooter
            loading={feed.isFetchingNextPage}
            failed={feed.isError || feed.isFetchNextPageError}
            exhausted={feed.hasNextPage !== true && cards.length > 0}
            onRetry={() => void feed.fetchNextPage()}
          />
        }
      />
    </View>
  );
}


function FeedFooter({
  loading,
  failed,
  exhausted,
  onRetry,
}: {
  readonly loading: boolean;
  readonly failed: boolean;
  readonly exhausted: boolean;
  readonly onRetry: () => void;
}) {
  if (failed) {
    return <FeedRetryRow onRetry={onRetry} />;
  }
  if (loading) {
    return (
      <View style={styles.footer}>
        {Array.from({ length: SKELETON_CARDS }, (_unused, index) => (
          <FeedSkeletonCard key={index} />
        ))}
      </View>
    );
  }
  if (exhausted) {
    return <FeedTerminalCard />;
  }
  return <ActivityIndicator style={styles.spinner} color={colors.accent} />;
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: feedColors.cardSurface,
  },
  list: {
    gap: feedMetrics.cardGap,
    padding: feedMetrics.listInset,
    paddingBottom: spacing.xl,
  },
  footer: {
    gap: feedMetrics.cardGap,
    paddingTop: feedMetrics.cardGap,
  },
  spinner: {
    paddingVertical: spacing.md,
  },
});
