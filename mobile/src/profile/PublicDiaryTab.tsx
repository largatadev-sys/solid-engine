import { useEffect, useRef, useState } from 'react';
import { Animated, ActivityIndicator, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { MediaThumb } from '../media/MediaThumb';
import { Postcard } from '../diary/Postcard';
import { PostcardPreview } from '../diary/PostcardPreview';
import { inTripDayOrder, tripEntryCountLabel } from '../diary/postcardAnatomy';
import { useReducedMotion } from '../components/useReducedMotion';
import { asDiaryEntry } from '../feed/publicDiaryPostcard';
import { usePublicDiaryTrips } from '../query/publicProfileQueries';
import { usePublicTripDiary } from '../query/feedQueries';
import { useRevalidateOnFocus } from '../query/useRevalidateOnFocus';
import { colors, spacing } from '../theme';
import {
  profileColors,
  profileMetrics,
  profileTypography,
  publicProfileMotion,
  workspaceColors,
} from '../theme/workspaceTokens';
import { diaryPaneState } from './diaryPaneState';
import { PROFILE_DIARY_FAILED, PROFILE_DIARY_RETRY_LABEL } from './profileCopy';
import { PublicProfileEmptyState } from './PublicProfileHeader';
import {
  PUBLIC_DIARY_EMPTY_TITLE,
  SHOW_MORE_LABEL,
  UNTITLED_TRIP,
  publicDiaryEmptyBody,
} from './publicProfileCopy';
import { showcaseMetaLine } from './showcaseCard';
import type { DiaryEntryResponse, DiaryTripResponse } from '../types/api';


interface PublicDiaryTabProps {
  readonly handle: string;
  readonly subjectId: string;
  readonly displayName: string;
}


export function PublicDiaryTab({ handle, subjectId, displayName }: PublicDiaryTabProps) {
  const trips = usePublicDiaryTrips(handle, true);
  const rows = (trips.data?.pages ?? []).flatMap((page) => page.items);
  const state = diaryPaneState(trips, rows.length);

  useRevalidateOnFocus(trips);

  if (state === 'loading') {
    return <ActivityIndicator style={styles.loading} color={colors.accent} />;
  }

  if (state === 'empty') {
    return (
      <PublicProfileEmptyState
        title={PUBLIC_DIARY_EMPTY_TITLE}
        body={publicDiaryEmptyBody(displayName)}
      />
    );
  }

  return (
    <View style={styles.pane}>
      {state === 'failed' && (
        <Pressable
          onPress={() => void trips.refetch()}
          accessibilityRole="button"
          accessibilityLabel={PROFILE_DIARY_RETRY_LABEL}
        >
          <Text style={styles.failed}>{PROFILE_DIARY_FAILED}</Text>
        </Pressable>
      )}
      {state === 'rows' &&
        rows.map((trip, index) => (
          <TripSection
            key={trip.itineraryId}
            trip={trip}
            subjectId={subjectId}
            first={index === 0}
          />
        ))}

      {trips.hasNextPage === true && (
        <Pressable
          style={styles.more}
          onPress={() => void trips.fetchNextPage()}
          accessibilityRole="button"
          accessibilityLabel={`Show more trips from ${displayName}`}
        >
          <Text style={styles.moreLabel}>{SHOW_MORE_LABEL}</Text>
        </Pressable>
      )}
    </View>
  );
}


function TripSection({
  trip,
  subjectId,
  first,
}: {
  readonly trip: DiaryTripResponse;
  readonly subjectId: string;
  readonly first: boolean;
}) {
  const [open, setOpen] = useState(first);
  const spin = useRef(new Animated.Value(first ? 1 : 0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    Animated.timing(spin, {
      toValue: open ? 1 : 0,
      duration: reducedMotion ? 0 : publicProfileMotion.sectionExpandMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [open, reducedMotion, spin]);
  const diary = usePublicTripDiary(trip.itineraryId, subjectId, open);

  const postcards =
    diary.data === undefined ? [] : inTripDayOrder(diary.data.postcards.map(asDiaryEntry));
  const sectionState = diaryPaneState(diary, postcards.length);
  const [previewing, setPreviewing] = useState<DiaryEntryResponse | null>(null);

  return (
    <View style={styles.section}>
      <Pressable
        style={styles.sectionHeader}
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${open ? 'Collapse' : 'Expand'} postcards from ${trip.title ?? UNTITLED_TRIP}`}
      >
        <MediaThumb
          url={trip.coverImageUrl ?? null}
          style={styles.thumb}
          accessibilityLabel={`Cover photo for ${trip.title ?? UNTITLED_TRIP}`}
          fallback={<View />}
        />
        <View style={styles.sectionText}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            {trip.title ?? UNTITLED_TRIP}
          </Text>
          <Text style={styles.sectionMeta} numberOfLines={1}>
            {showcaseMetaLine(trip.destination, trip.dayCount ?? 0) ??
              tripEntryCountLabel(trip.entryCount)}
          </Text>
        </View>
        <Animated.View
          style={[
            styles.chevron,
            {
              transform: [
                {
                  rotate: spin.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['-45deg', '45deg'],
                  }),
                },
              ],
            },
          ]}
        />
      </Pressable>

      {open && (
        <View style={styles.sectionBody}>
          {sectionState === 'loading' && <ActivityIndicator color={colors.accent} />}
          {sectionState === 'rows' &&
            postcards.map((entry) => (
              <Postcard key={entry.id} entry={entry} onPress={() => setPreviewing(entry)} />
            ))}
        </View>
      )}

      <PostcardPreview
        entry={previewing}
        tripTitle={trip.title}
        onDismiss={() => setPreviewing(null)}
      />
    </View>
  );
}


const CHEVRON = {
  width: profileMetrics.chevronSize,
  height: profileMetrics.chevronSize,
  flexGrow: 0,
  flexShrink: 0,
  borderRightWidth: profileMetrics.chevronStroke,
  borderBottomWidth: profileMetrics.chevronStroke,
  borderRightColor: profileColors.chevron,
  borderBottomColor: profileColors.chevron,
  marginRight: spacing.xs,
} as const;

const styles = StyleSheet.create({
  pane: {
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.md,
    gap: spacing.sm3,
  },
  loading: {
    marginTop: spacing.lg,
  },
  failed: {
    ...profileTypography.sectionMeta,
    color: colors.danger,
  },
  section: {
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: profileMetrics.sectionRadius,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    padding: spacing.sm3,
  },
  thumb: {
    width: profileMetrics.sectionThumb,
    height: profileMetrics.sectionThumb,
    borderRadius: profileMetrics.sectionThumbRadius,
    backgroundColor: profileColors.avatarWell,
    flexGrow: 0,
    flexShrink: 0,
  },
  sectionText: {
    flex: 1,
    gap: spacing.hair,
  },
  sectionTitle: {
    ...profileTypography.sectionTitle,
    color: workspaceColors.title,
  },
  sectionMeta: {
    ...profileTypography.sectionMeta,
    color: profileColors.meta,
  },
  chevron: CHEVRON,
  sectionBody: {
    paddingHorizontal: spacing.sm3,
    paddingBottom: spacing.sm3,
    gap: spacing.sm3,
  },
  more: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  moreLabel: {
    ...profileTypography.sectionTitle,
    color: workspaceColors.accent,
  },
});
