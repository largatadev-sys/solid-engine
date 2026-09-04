import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { FeedToast } from '../feed/FeedToast';
import { MediaThumb } from '../media/MediaThumb';
import { RowEntrance } from '../members/RowEntrance';
import { invitedAgoLabel } from '../members/invitationCard';
import { fetchesMore } from '../discovery/resultsPaging';
import { initialsFor } from '../onboarding/initials';
import { useDecideFollowRequest, useFollowRequests } from '../query/followQueries';
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
import type { FollowRequestResponse } from '../types/api';
import { handleLabel, personLabel } from './PersonRow';
import {
  APPROVE_LABEL,
  DECLINE_FAILED_TOAST,
  DECLINE_LABEL,
  FOLLOW_REQUESTS_TITLE,
  NO_REQUESTS_BODY,
  NO_REQUESTS_TITLE,
  approveFailedToast,
  askedAgoLine,
} from './privateProfileCopy';
import { PUBLIC_PROFILE_BACK_LABEL } from './publicProfileCopy';
import { decided, emptyRequestQueue, restored, shownRows } from './requestQueue';
import { publicProfileRoute } from './travelerRoutes';


export function FollowRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inbox = useFollowRequests();
  const decide = useDecideFollowRequest();
  const [queue, setQueue] = useState(emptyRequestQueue());
  const [toast, setToast] = useState<string | null>(null);

  useRevalidateOnFocus(inbox);

  const served = (inbox.data?.pages ?? []).flatMap((page) => page.items);
  const rows = shownRows(served, queue);

  function onDecide(request: FollowRequestResponse, verdict: 'approve' | 'decline') {
    const travelerId = request.traveler.id;
    setQueue((held) => decided(held, travelerId, verdict));

    decide.mutate(
      { travelerId, verdict },
      {
        onError: () => {
          setQueue((held) => restored(held, travelerId));
          setToast(
            verdict === 'approve'
              ? approveFailedToast(request.traveler.handle)
              : DECLINE_FAILED_TOAST,
          );
        },
      },
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Pressable
          style={styles.back}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={PUBLIC_PROFILE_BACK_LABEL}
        >
          <Icon name="back" size={20} color={workspaceColors.title} />
        </Pressable>
        <Text style={styles.title}>{FOLLOW_REQUESTS_TITLE}</Text>
      </View>

      {inbox.isPending ? (
        <ActivityIndicator style={styles.loading} color={colors.accent} />
      ) : rows.length === 0 ? (
        <RowEntrance
          replayKey="empty"
          durationMs={publicProfileMotion.resultRiseMs}
          risePx={publicProfileMotion.resultRisePx}
        >
          <View style={styles.empty}>
            <View style={styles.emptyCircle}>
              <Icon
                name="personPlus"
                size={followMetrics.emptyGlyph}
                color={workspaceColors.accent}
              />
            </View>
            <Text style={styles.emptyTitle}>{NO_REQUESTS_TITLE}</Text>
            <Text style={styles.emptyBody}>{NO_REQUESTS_BODY}</Text>
          </View>
        </RowEntrance>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(request) => request.traveler.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <RowEntrance
              replayKey={item.traveler.id}
              durationMs={publicProfileMotion.resultRiseMs}
              risePx={publicProfileMotion.resultRisePx}
              delayMs={
                index < publicProfileMotion.resultCap
                  ? index * publicProfileMotion.resultStepMs
                  : 0
              }
            >
              <RequestRow
                request={item}
                onOpen={() => {
                  if (item.traveler.handle !== null) {
                    router.push(publicProfileRoute(item.traveler.handle));
                  }
                }}
                onApprove={() => onDecide(item, 'approve')}
                onDecline={() => onDecide(item, 'decline')}
              />
            </RowEntrance>
          )}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (
              fetchesMore(
                rows.length - 1,
                rows.length,
                inbox.hasNextPage === true,
                inbox.isFetchingNextPage,
              )
            ) {
              void inbox.fetchNextPage();
            }
          }}
        />
      )}

      <FeedToast
        message={toast}
        holdMs={publicProfileMotion.toastHoldMs}
        onDone={() => setToast(null)}
      />
    </View>
  );
}


function RequestRow({
  request,
  onOpen,
  onApprove,
  onDecline,
}: {
  readonly request: FollowRequestResponse;
  readonly onOpen: () => void;
  readonly onApprove: () => void;
  readonly onDecline: () => void;
}) {
  const name = personLabel(request.traveler);
  const size = profileMetrics.personRow;
  const who = handleLabel(request.traveler);

  return (
    <Pressable
      style={styles.row}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Open the profile of ${who}`}
    >
      <MediaThumb
        url={request.traveler.avatarUrl}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        fallbackStyle={styles.avatarWell}
        accessibilityLabel={`Profile photo of ${name}`}
        fallback={
          <Text style={styles.initials}>{initialsFor(request.traveler.displayName, null)}</Text>
        }
      />

      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.handle} numberOfLines={1}>
          {who}
        </Text>
        <Text style={styles.asked} numberOfLines={1}>
          {askedAgoLine(invitedAgoLabel(request.requestedAt, Date.now()))}
        </Text>
      </View>

      <Pressable
        style={styles.approve}
        onPress={onApprove}
        accessibilityRole="button"
        accessibilityLabel={`${APPROVE_LABEL} ${who}`}
      >
        <Text style={styles.approveLabel}>{APPROVE_LABEL}</Text>
      </Pressable>

      <Pressable
        style={styles.decline}
        onPress={onDecline}
        accessibilityRole="button"
        accessibilityLabel={`${DECLINE_LABEL} ${who}`}
      >
        <Text style={styles.declineLabel}>{DECLINE_LABEL}</Text>
      </Pressable>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md2,
    paddingVertical: spacing.sm2,
  },
  back: {
    width: followMetrics.kebabTarget,
    height: followMetrics.kebabTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...followTypography.listTitle, color: workspaceColors.title },
  loading: { marginTop: spacing.xl },
  list: { paddingHorizontal: spacing.md2, paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm3,
    paddingVertical: spacing.sm2,
    paddingHorizontal: spacing.sm3,
    borderRadius: profileMetrics.statsRadius,
  },
  avatarWell: { backgroundColor: profileColors.avatarWell },
  initials: { ...profileTypography.personInitials, color: profileColors.avatarInk },
  rowText: { flex: 1, gap: spacing.hair },
  name: { ...followTypography.listTitle, color: workspaceColors.title },
  handle: { ...profileTypography.meta, color: profileColors.meta },
  asked: { ...profileTypography.accountHelper, color: profileColors.meta },
  approve: {
    height: followMetrics.approvePillHeight,
    paddingHorizontal: spacing.md,
    borderRadius: workspaceRadii.pill,
    backgroundColor: workspaceColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveLabel: { ...profileTypography.compactPill, color: profileColors.onAccent },
  decline: {
    height: followMetrics.approvePillHeight,
    paddingHorizontal: spacing.sm2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineLabel: { ...profileTypography.compactPill, color: followColors.chipInk },
  empty: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
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
  emptyTitle: { ...profileTypography.emptyTitle, color: workspaceColors.title },
  emptyBody: {
    ...profileTypography.emptyBody,
    color: profileColors.meta,
    textAlign: 'center',
    maxWidth: profileMetrics.emptyBodyWidth,
  },
});
