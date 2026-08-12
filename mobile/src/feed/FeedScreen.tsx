import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { comingSoon } from '../components/comingSoon';
import { colors, spacing } from '../theme';
import { feedColors, feedMetrics } from '../theme/workspaceTokens';
import type { FeedPostcardResponse } from '../types/api';
import { feedRepository } from '../repositories/feedRepository';
import { useFeed } from '../query/feedQueries';
import { FeedCard, type StubControl } from './FeedCard';
import { FeedHeader } from './FeedHeader';
import {
  FeedEmptyState,
  FeedLoadFailed,
  FeedRetryRow,
  FeedSkeletonCard,
  FeedTerminalCard,
} from './FeedStates';
import { FeedToast } from './FeedToast';
import { FEED_REFRESHED_TOAST } from './feedCopy';
import { atTop, HEADER_SHOWING, onScroll } from './headerVisibility';
import { freshCount, POLL_MS, showsPill } from './freshPosts';
import { onHomeTabRetap } from './homeTabRetap';
import { NewPostsPill } from './NewPostsPill';

const SKELETON_CARDS = 2;

const HEADER_SLIDE_MS = 180;


export function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const feed = useFeed();

  const [now, setNow] = useState(() => Date.now());
  const [header, setHeader] = useState(HEADER_SHOWING);
  const [fresh, setFresh] = useState(0);
  const [scrolledDown, setScrolledDown] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [, redrawPages] = useState(0);

  const pages = useRef(new Map<string, number>());
  const list = useRef<FlatList<FeedPostcardResponse> | null>(null);
  const offset = useRef(0);
  const slide = useRef(new Animated.Value(0)).current;

  const cards = (feed.data?.pages ?? []).flatMap((page) => page.items);
  const shownIds = cards.map((card) => card.id).join(',');

  useEffect(() => {
    Animated.timing(slide, {
      toValue: header.hidden ? -feedMetrics.headerHeight : 0,
      duration: HEADER_SLIDE_MS,
      useNativeDriver: true,
    }).start();
  }, [header.hidden, slide]);

  const toTop = useCallback((animated: boolean) => {
    list.current?.scrollToOffset({ offset: 0, animated });
  }, []);

  const refresh = useCallback(() => {
    setNow(Date.now());
    setFresh(0);
    void feed.refetch();
  }, [feed]);

  useEffect(
    () =>
      onHomeTabRetap(() => {
        if (atTop(offset.current)) {
          refresh();
          setToast(FEED_REFRESHED_TOAST);
          return;
        }
        toTop(true);
      }),
    [refresh, toTop],
  );

  // The interval is armed ONCE and reads the ids at fire time through a ref. Depending on the
  // ids instead restarts the timer on every refresh, heart tap and page merge — so on a feed
  // anyone is actually using, the poll silently never fires and the pill never appears.
  const known = useRef(shownIds);
  known.current = shownIds;

  useEffect(() => {
    const tick = setInterval(() => {
      if (known.current === '') {
        return;
      }
      const showing = known.current.split(',');
      void feedRepository
        .fetchPage()
        .then((page) => setFresh(freshCount(page.items.map((card) => card.id), showing)))
        .catch(() => undefined);
    }, POLL_MS);
    return () => clearInterval(tick);
  }, []);

  const pageOf = (cardId: string) => pages.current.get(cardId) ?? 0;

  const rememberPage = useCallback((cardId: string, page: number) => {
    if (pages.current.get(cardId) === page) {
      return;
    }
    pages.current.set(cardId, page);
    redrawPages((tick) => tick + 1);
  }, []);

  const scrolled = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    offset.current = y;
    setScrolledDown(!atTop(y));
    setHeader((state) => onScroll(state, y));
  };

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

  const takeTheFreshPosts = () => {
    toTop(true);
    refresh();
  };

  const pullToRefresh = () => {
    const had = cards.length;
    setNow(Date.now());
    setFresh(0);
    void feed.refetch().then((result) => {
      const after = (result.data?.pages ?? []).flatMap((page) => page.items).length;
      if (after <= had) {
        setToast(FEED_REFRESHED_TOAST);
      }
    });
  };

  const reachedTheEnd = () => {
    if (feed.hasNextPage === true && !feed.isFetchingNextPage) {
      void feed.fetchNextPage();
    }
  };

  const chrome = (
    <Animated.View style={[styles.header, { transform: [{ translateY: slide }] }]}>
      <FeedHeader
        onSearch={() => comingSoon('search')}
        onNotifications={() => comingSoon('notifications')}
      />
    </Animated.View>
  );

  if (feed.isPending) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {chrome}
        <View style={styles.list}>
          <FeedSkeletonCard />
          <FeedSkeletonCard />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {chrome}

      {showsPill(fresh, scrolledDown) && <NewPostsPill onPress={takeTheFreshPosts} />}

      <FlatList
        ref={list}
        data={cards}
        keyExtractor={(card) => card.id}
        contentContainerStyle={styles.list}
        onScroll={scrolled}
        scrollEventThrottle={16}
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
            onRefresh={pullToRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          feed.isError ? <FeedLoadFailed onRetry={() => void feed.refetch()} /> : <FeedEmptyState />
        }
        ListFooterComponent={
          cards.length === 0 ? null : (
            <FeedFooter
              loading={feed.isFetchingNextPage}
              failed={feed.isError || feed.isFetchNextPageError}
              exhausted={feed.hasNextPage !== true}
              onRetry={() => void feed.fetchNextPage()}
            />
          )
        }
      />

      <FeedToast message={toast} onDone={() => setToast(null)} />
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
  header: {
    zIndex: 1,
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
