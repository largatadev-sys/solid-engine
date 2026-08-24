import { Link } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { comingSoon } from '../../../src/components/comingSoon';
import { Icon } from '../../../src/components/Icon';
import { InvitationInbox } from '../../../src/components/InvitationInbox';
import { AnimatedPressable, usePressFeedback } from '../../../src/components/usePressFeedback';
import { useReducedMotion } from '../../../src/components/useReducedMotion';
import { TripRow } from '../../../src/itineraries/TripRow';
import { TripTabRow } from '../../../src/itineraries/TripTabRow';
import { pickTab, usePickedTab } from '../../../src/itineraries/tripTabStore';
import {
  landingTab,
  showsArchivedLink,
  showsCreateBar,
  tabEmptyCopy,
  tripsInTab,
  type TripTab,
} from '../../../src/itineraries/tripTabs';
import { useMyItineraries } from '../../../src/query/itineraryQueries';
import { useRevalidateOnFocus } from '../../../src/query/useRevalidateOnFocus';
import { TRIPS_TAB_ROUTE } from '../../../src/navigation/authRoutes';
import { useTabRetap } from '../../../src/navigation/useTabRetap';
import { atTop } from '../../../src/feed/headerVisibility';
import { RETAP_SCROLL_THROTTLE_MS } from '../../../src/navigation/retapScroll';
import { SCROLL_TO_TOP_ANIMATED } from '../../../src/navigation/scrollToTop';
import { FeedToast } from '../../../src/feed/FeedToast';
import { CAUGHT_UP_TOAST } from '../../../src/feed/feedCopy';
import type { ItineraryResponse } from '../../../src/types/api';
import { colors, radii, spacing, typography } from '../../../src/theme';
import { tripTabColors, tripTabMetrics, tripTabMotion, tripTabTypography } from '../../../src/theme/workspaceTokens';


export default function MyTripsScreen() {
  const trips = useMyItineraries();
  const { data, isPending, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trips;

  useRevalidateOnFocus(trips);

  const picked = usePickedTab();
  const offsets = useRef<Partial<Record<TripTab, number>>>({});
  const lists = useRef<Partial<Record<TripTab, FlatList<ItineraryResponse> | null>>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);

  const itineraries = data?.pages.flatMap((page) => page.items) ?? [];
  const active = landingTab(itineraries, picked);
  const rows = tripsInTab(itineraries, active);

  const listFor = (tab: TripTab) => (list: FlatList<ItineraryResponse> | null) => {
    if (list === null) {
      return;
    }
    lists.current[tab] = list;
    const offset = offsets.current[tab];
    if (offset !== undefined && offset > 0) {
      list.scrollToOffset({ offset, animated: false });
    }
  };

  const activeTab = useRef(active);
  activeTab.current = active;

  useTabRetap(
    TRIPS_TAB_ROUTE,
    useCallback(() => {
      const tab = activeTab.current;
      if (atTop(offsets.current[tab] ?? 0)) {
        void refetch();
        setToast(CAUGHT_UP_TOAST);
        return;
      }
      offsets.current[tab] = 0;
      lists.current[tab]?.scrollToOffset({ offset: 0, animated: SCROLL_TO_TOP_ANIMATED });
    }, [refetch]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trips</Text>
        <SearchIcon />
      </View>

      <TripTabRow selected={active} onSelect={pickTab} />

      {isPending && <ActivityIndicator size="large" color={colors.accent} style={styles.centered} />}

      {isError && (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Could not load your trips</Text>
          <Text style={styles.caption}>{error.message}</Text>
          <Pressable style={styles.button} onPress={() => void refetch()} accessibilityRole="button">
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {!isPending && !isError && (
        <FadeRise key={active} style={styles.listWrap}>
          <FlatList
            ref={listFor(active)}
            data={rows}
            keyExtractor={(itinerary) => itinerary.id}
            contentContainerStyle={rows.length === 0 ? styles.emptyContainer : styles.listContainer}
            renderItem={({ item }) => <TripRow itinerary={item} />}
            onScroll={(event) => {
              offsets.current[active] = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={RETAP_SCROLL_THROTTLE_MS}
            onRefresh={() => {
              setPulling(true);
              void refetch().finally(() => setPulling(false));
            }}
            refreshing={pulling}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={<InvitationInbox />}
            ListEmptyComponent={<TabEmptyState tab={active} />}
            ListFooterComponent={
              <View>
                {isFetchingNextPage ? (
                  <ActivityIndicator color={colors.accent} style={styles.footer} />
                ) : null}
                {rows.length > 0 && showsArchivedLink(active) ? <ArchivedLink /> : null}
              </View>
            }
          />
        </FadeRise>
      )}

      {showsCreateBar(active) && (
        <View style={styles.ctas}>
          <PlanATripBar />
        </View>
      )}

      <FeedToast message={toast} onDone={() => setToast(null)} />
    </View>
  );
}


function TabEmptyState({ tab }: { tab: TripTab }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyCopy}>{tabEmptyCopy(tab)}</Text>
      {showsArchivedLink(tab) && <ArchivedLink />}
    </View>
  );
}


function SearchIcon() {
  const { opacity, onPressIn, onPressOut } = usePressFeedback();

  return (
    <AnimatedPressable
      style={{ opacity }}
      onPress={() => comingSoon('tripSearch')}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      accessibilityLabel="Search trips, coming soon"
      hitSlop={8}>
      <Icon name="search" size={HEADER_ICON_SIZE} color={colors.textPrimary} />
    </AnimatedPressable>
  );
}


function PlanATripBar() {
  const { opacity, onPressIn, onPressOut } = usePressFeedback();

  return (
    <Link href="/itineraries/new" asChild>
      <AnimatedPressable
        style={StyleSheet.flatten([styles.primaryCta, { opacity }])}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={CREATE_LABEL}>
        <Text style={styles.primaryCtaText}>{CREATE_LABEL}</Text>
        <Icon name="plusCircle" size={CTA_ICON_SIZE} color={colors.textOnAccent} />
      </AnimatedPressable>
    </Link>
  );
}


function ArchivedLink() {
  const { opacity, onPressIn, onPressOut } = usePressFeedback();

  return (
    <View style={styles.archivedRow}>
      <Link href="/itineraries/archived" asChild>
        <AnimatedPressable
          style={{ opacity }}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          accessibilityRole="link"
          accessibilityLabel={ARCHIVED_LINK_LABEL}>
          <Text style={styles.archivedLink}>{ARCHIVED_LINK_LABEL}</Text>
        </AnimatedPressable>
      </Link>
    </View>
  );
}


function FadeRise({ children, style }: { children: React.ReactNode; style?: object }) {
  const entrance = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: reducedMotion ? 0 : tripTabMotion.listRiseMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [entrance, reducedMotion]);

  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [tripTabMotion.listRisePx, 0],
  });

  return (
    <Animated.View style={[style, { opacity: entrance, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

const CREATE_LABEL = 'Plan a Trip';

const ARCHIVED_LINK_LABEL = 'Archived trips';


const HEADER_ICON_SIZE = 20;

const CTA_ICON_SIZE = 16;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: { ...typography.title, color: colors.textPrimary },
  listWrap: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  listContainer: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  emptyContainer: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm3, padding: spacing.lg },
  emptyCopy: { ...tripTabTypography.empty, color: colors.textSecondary, textAlign: 'center' },
  errorTitle: { ...typography.heading, color: colors.danger },
  caption: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  footer: { paddingVertical: spacing.md },
  archivedRow: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.xs },
  archivedLink: {
    ...tripTabTypography.archivedLink,
    color: tripTabColors.archivedLink,
    textDecorationLine: 'underline',
  },
  ctas: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  primaryCta: {
    flexDirection: 'row',
    height: tripTabMetrics.planCtaHeight,
    borderRadius: radii.control,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryCtaText: { ...typography.actionMedium, color: colors.textOnAccent },
  button: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  buttonText: { ...typography.bodyStrong, color: colors.textOnAccent },
});
