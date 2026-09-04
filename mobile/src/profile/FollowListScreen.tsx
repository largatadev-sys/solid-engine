import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { RowEntrance } from '../members/RowEntrance';
import { RowExit } from '../members/RowExit';
import { useSafeBack } from '../navigation/safeBack';
import { useMe } from '../hooks/useMe';
import { useFollowers, useFollowing } from '../query/followQueries';
import { useProfileStats } from '../query/profileQueries';
import { usePublicProfile } from '../query/publicProfileQueries';
import { useRevalidateOnFocus } from '../query/useRevalidateOnFocus';
import { colors, spacing } from '../theme';
import {
  followColors,
  followMetrics,
  followTypography,
  profileColors,
  profileMetrics,
  profileTypography,
  publicProfileMotion,
  workspaceColors,
  workspaceRadii,
} from '../theme/workspaceTokens';
import { PersonRow } from './PersonRow';
import {
  FIND_PEOPLE_LABEL,
  FOLLOWERS_EMPTY_BODY,
  FOLLOWERS_EMPTY_TITLE,
  FOLLOWERS_TITLE,
  FOLLOWING_EMPTY_BODY,
  FOLLOWING_EMPTY_TITLE,
  FOLLOWING_TITLE,
  FOLLOW_LIST_RETRY_LABEL,
  PUBLIC_PROFILE_BACK_LABEL,
  followersCountLabel,
  followingCountLabel,
} from './publicProfileCopy';
import { fetchesMore } from '../discovery/resultsPaging';
import { confirmWith } from '../components/confirmDestructive';
import { FeedToast } from '../feed/FeedToast';
import { failureToast } from '../removal/removalFailure';
import { useRemoveFollower } from '../query/followQueries';
import { FollowerSheet } from './FollowerSheet';
import { rowAffordance } from './followerAffordance';
import {
  REMOVE_FOLLOWER_BODY,
  REMOVE_FOLLOWER_CANCEL_LABEL,
  REMOVE_FOLLOWER_CONFIRM_LABEL,
  removeFollowerTitle,
} from './privateProfileCopy';
import type { TravelerCardResponse } from '../types/api';
import { shownFollowCount } from './followListCount';
import { isProfilePrivate } from './gatedRead';
import { LockedProfileNotice } from './LockedProfileNotice';
import { publicProfileRoute, travelerDestination } from './travelerRoutes';
import { DISCOVERY_SEARCH_ROUTE } from '../discovery/discoveryRoutes';


export type FollowListSide = 'followers' | 'following';


export function FollowListScreen({ side }: { readonly side: FollowListSide }) {
  const router = useRouter();
  const goBack = useSafeBack();
  const insets = useSafeAreaInsets();
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const subject = handle ?? '';

  const { state } = useMe();
  const viewerHandle = state.kind === 'ok' ? state.me.handle : null;
  const isSelf = travelerDestination(subject, viewerHandle).kind === 'own';

  const followers = useFollowers(side === 'followers' ? subject : '');
  const following = useFollowing(side === 'following' ? subject : '');
  const list = side === 'followers' ? followers : following;

  const publicProfile = usePublicProfile(isSelf ? '' : subject);
  const ownStats = useProfileStats();

  useRevalidateOnFocus(list);

  const remove = useRemoveFollower();
  const [sheetFor, setSheetFor] = useState<TravelerCardResponse | null>(null);
  const [lastSheetFor, setLastSheetFor] = useState<TravelerCardResponse | null>(null);
  const [removed, setRemoved] = useState<readonly string[]>([]);
  const [leaving, setLeaving] = useState<readonly string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const served = (list.data?.pages ?? []).flatMap((page) => page.items);
  const rows = served.filter((person) => !removed.includes(person.id));
  const kebabs = rowAffordance(side, isSelf) === 'kebab';

  function openSheet(person: TravelerCardResponse) {
    setLastSheetFor(person);
    setSheetFor(person);
  }

  function onRemove(person: TravelerCardResponse) {
    setSheetFor(null);
    confirmWith(
      {
        title: removeFollowerTitle(person.handle),
        body: REMOVE_FOLLOWER_BODY,
        confirmLabel: REMOVE_FOLLOWER_CONFIRM_LABEL,
        cancelLabel: REMOVE_FOLLOWER_CANCEL_LABEL,
      },
      () => {
        setLeaving((held) => (held.includes(person.id) ? held : [...held, person.id]));
        remove.mutate(person.id, {
          onError: (cause) => {
            setLeaving((held) => held.filter((id) => id !== person.id));
            setRemoved((held) => held.filter((id) => id !== person.id));
            setToast(failureToast(cause));
          },
        });
      },
    );
  }

  const counted = isSelf
    ? side === 'followers'
      ? ownStats.data?.followersCount
      : ownStats.data?.followingCount
    : side === 'followers'
      ? publicProfile.data?.followersCount
      : publicProfile.data?.followingCount;
  const servedKey = served.map((person) => person.id).join(',');

  useEffect(() => {
    const stillThere = new Set(servedKey.split(','));
    setLeaving((held) => held.filter((id) => stillThere.has(id)));
    setRemoved((held) => held.filter((id) => stillThere.has(id)));
  }, [servedKey]);

  const total = shownFollowCount(counted, servedKey === '' ? [] : servedKey.split(','), leaving);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Pressable
          style={styles.back}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={PUBLIC_PROFILE_BACK_LABEL}
        >
          <Icon name="back" size={20} color={workspaceColors.title} />
        </Pressable>
        <Text style={styles.title}>
          {side === 'followers' ? FOLLOWERS_TITLE : FOLLOWING_TITLE}
        </Text>
      </View>

      {list.isPending ? (
        <ActivityIndicator style={styles.loading} color={colors.accent} />
      ) : list.isError && rows.length === 0 && isProfilePrivate(list.error) ? (
        <LockedProfileNotice
          displayName={publicProfile.data?.traveler.displayName ?? null}
          handle={subject}
          linked
        />
      ) : list.isError && rows.length === 0 ? (
        <Pressable
          style={styles.retry}
          onPress={() => void list.refetch()}
          accessibilityRole="button"
          accessibilityLabel={FOLLOW_LIST_RETRY_LABEL}
        >
          <Text style={styles.retryLabel}>{FOLLOW_LIST_RETRY_LABEL}</Text>
        </Pressable>
      ) : rows.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyCircle}>
            <Icon
              name={side === 'followers' ? 'userPlus' : 'personSearch'}
              size={followMetrics.emptyGlyph}
              color={workspaceColors.accent}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {side === 'followers' ? FOLLOWERS_EMPTY_TITLE : FOLLOWING_EMPTY_TITLE}
          </Text>
          <Text style={styles.emptyBody}>
            {side === 'followers' ? FOLLOWERS_EMPTY_BODY : FOLLOWING_EMPTY_BODY}
          </Text>
          {side === 'following' && (
            <Pressable
              style={styles.findPeople}
              onPress={() => router.push(DISCOVERY_SEARCH_ROUTE)}
              accessibilityRole="button"
              accessibilityLabel={FIND_PEOPLE_LABEL}
            >
              <Text style={styles.findPeopleLabel}>{FIND_PEOPLE_LABEL}</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          <Text style={styles.count}>
            {side === 'followers' ? followersCountLabel(total) : followingCountLabel(total)}
          </Text>
          <FlatList
            data={rows}
            keyExtractor={(person) => person.id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <RowEntrance
                replayKey={item.id}
                durationMs={publicProfileMotion.resultRiseMs}
                risePx={publicProfileMotion.resultRisePx}
                delayMs={
                  index < publicProfileMotion.resultCap
                    ? index * publicProfileMotion.resultStepMs
                    : 0
                }
              >
                <RowExit
                  leaving={leaving.includes(item.id)}
                  onGone={() => setRemoved((held) => (held.includes(item.id) ? held : [...held, item.id]))}
                >
                <PersonRow
                  person={item}
                  onPress={() => {
                    if (item.handle !== null) {
                      router.push(publicProfileRoute(item.handle));
                    }
                  }}
                  {...(kebabs ? { onKebab: () => openSheet(item) } : {})}
                />
                </RowExit>
              </RowEntrance>
            )}
            onEndReachedThreshold={0.5}
            onEndReached={() => {
              if (
                fetchesMore(
                  rows.length - 1,
                  rows.length,
                  list.hasNextPage === true,
                  list.isFetchingNextPage,
                )
              ) {
                void list.fetchNextPage();
              }
            }}
            ListFooterComponent={
              list.isError || list.isFetchNextPageError ? (
                <Pressable
                  style={styles.retry}
                  onPress={() => void list.fetchNextPage()}
                  accessibilityRole="button"
                  accessibilityLabel={FOLLOW_LIST_RETRY_LABEL}
                >
                  <Text style={styles.retryLabel}>{FOLLOW_LIST_RETRY_LABEL}</Text>
                </Pressable>
              ) : null
            }
          />
        </>
      )}

      <FollowerSheet
        follower={sheetFor}
        lastFollower={lastSheetFor}
        onRemove={onRemove}
        onDismiss={() => setSheetFor(null)}
      />

      <FeedToast
        message={toast}
        holdMs={publicProfileMotion.toastHoldMs}
        onDone={() => setToast(null)}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: workspaceColors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm3,
    paddingTop: spacing.xs2,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  title: {
    ...followTypography.listTitle,
    color: workspaceColors.title,
  },
  count: {
    ...profileTypography.countLine,
    color: profileColors.meta,
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.sm2,
    paddingBottom: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
  },
  loading: {
    marginTop: spacing.xl,
  },
  retry: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  retryLabel: {
    ...profileTypography.emptyBody,
    color: profileColors.meta,
  },
  empty: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm2,
  },
  emptyCircle: {
    width: followMetrics.emptyCircle,
    height: followMetrics.emptyCircle,
    borderRadius: followMetrics.emptyCircle / 2,
    backgroundColor: profileColors.emptyWell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...profileTypography.emptyTitle,
    color: workspaceColors.title,
  },
  emptyBody: {
    ...profileTypography.emptyBody,
    color: profileColors.meta,
    textAlign: 'center',
    maxWidth: profileMetrics.emptyBodyWidth,
  },
  findPeople: {
    marginTop: spacing.xs,
    height: followMetrics.seeAllCircle,
    paddingHorizontal: spacing.md2,
    borderRadius: workspaceRadii.pill,
    backgroundColor: workspaceColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findPeopleLabel: {
    ...followTypography.filterChip,
    color: profileColors.onAccent,
  },
});
