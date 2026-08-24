import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { entryEditorRoute } from '../diary/diaryEntryExit';
import { MediaThumb } from '../media/MediaThumb';
import { Postcard } from '../diary/Postcard';
import { PostcardPreview } from '../diary/PostcardPreview';
import { inTripDayOrder, tripEntryCountLabel } from '../diary/postcardAnatomy';
import { useMyDiaryEntries, useMyDiaryTrips } from '../query/diaryQueries';
import { useRevalidateOnFocus } from '../query/useRevalidateOnFocus';
import { colors, spacing } from '../theme';
import {
  profileColors,
  profileMetrics,
  profileTypography,
  workspaceColors,
} from '../theme/workspaceTokens';
import { diaryPaneState } from './diaryPaneState';
import {
  PROFILE_DIARY_EMPTY,
  PROFILE_DIARY_FAILED,
  PROFILE_DIARY_RETRY_LABEL,
  PROFILE_DIARY_SECTION_FAILED,
  PROFILE_DIARY_SECTION_RETRY_LABEL,
} from './profileCopy';
import { isExpanded, toggleExpanded } from './profileViewState';
import { showcaseMetaLine } from './showcaseCard';
import { stubLikeCountFor } from './stubMetrics';
import type { DiaryEntryResponse, DiaryTripResponse } from '../types/api';


export function ProfileDiaryTab() {
  const trips = useMyDiaryTrips();
  const rows = (trips.data?.pages ?? []).flatMap((page) => page.items);
  const state = diaryPaneState(trips, rows.length);

  useRevalidateOnFocus(trips);

  if (state === 'loading') {
    return <ActivityIndicator style={styles.loading} color={colors.accent} />;
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
      {state === 'empty' && <Text style={styles.empty}>{PROFILE_DIARY_EMPTY}</Text>}
      {state === 'rows' &&
        rows.map((trip, index) => (
          <TripSection key={trip.itineraryId} trip={trip} first={index === 0} />
        ))}

      {trips.hasNextPage === true && (
        <Pressable
          style={styles.more}
          onPress={() => void trips.fetchNextPage()}
          accessibilityRole="button"
          accessibilityLabel="Show more diary trips"
        >
          <Text style={styles.moreLabel}>Show more</Text>
        </Pressable>
      )}
    </View>
  );
}


function TripSection({ trip, first }: { readonly trip: DiaryTripResponse; readonly first: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(() => isExpanded(trip.itineraryId, first));
  const entries = useMyDiaryEntries(trip.itineraryId, open);

  const toggle = () => {
    toggleExpanded(trip.itineraryId, first);
    setOpen(isExpanded(trip.itineraryId, first));
  };

  const postcards = entries.data === undefined ? [] : inTripDayOrder(entries.data);
  const sectionState = diaryPaneState(entries, postcards.length);
  const [previewing, setPreviewing] = useState<DiaryEntryResponse | null>(null);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Pressable
          style={styles.sectionOpen}
          onPress={() =>
            router.push({ pathname: '/diary/[id]', params: { id: trip.itineraryId } })
          }
          accessibilityRole="button"
          accessibilityLabel={`Open the diary for ${trip.title ?? 'Untitled trip'}, ${tripEntryCountLabel(trip.entryCount)}`}
        >
          <MediaThumb
            url={trip.coverImageUrl ?? null}
            style={styles.thumb}
            accessibilityLabel={`Cover photo for ${trip.title ?? 'Untitled trip'}`}
            fallback={<View />}
          />
          <View style={styles.sectionText}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {trip.title ?? 'Untitled trip'}
            </Text>
            <Text style={styles.sectionMeta} numberOfLines={1}>
              {showcaseMetaLine(trip.destination, trip.dayCount ?? 0) ??
                tripEntryCountLabel(trip.entryCount)}
            </Text>
          </View>
        </Pressable>
        <Pressable
          style={styles.chevronHit}
          onPress={toggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${open ? 'Collapse' : 'Expand'} entries for ${trip.title ?? 'Untitled trip'}`}
        >
          <View style={open ? styles.chevronOpen : styles.chevronClosed} />
        </Pressable>
      </View>

      {open && (
        <View style={styles.sectionBody}>
          {sectionState === 'loading' && <ActivityIndicator color={colors.accent} />}
          {sectionState === 'failed' && (
            <Pressable
              onPress={() => void entries.refetch()}
              accessibilityRole="button"
              accessibilityLabel={PROFILE_DIARY_SECTION_RETRY_LABEL}
            >
              <Text style={styles.failed}>{PROFILE_DIARY_SECTION_FAILED}</Text>
            </Pressable>
          )}
          {sectionState === 'rows' &&
            postcards.map((entry) => (
              <Postcard
                key={entry.id}
                entry={entry}
                likes={stubLikeCountFor(entry.id)}
                onPress={() => setPreviewing(entry)}
              />
            ))}
        </View>
      )}

      <PostcardPreview
        entry={previewing}
        tripTitle={trip.title}
        onEdit={(entry) => {
          setPreviewing(null);
          router.push(entryEditorRoute('profile', trip.itineraryId, entry.id));
        }}
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
  empty: {
    ...profileTypography.sectionMeta,
    color: profileColors.meta,
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
    padding: spacing.sm3,
  },
  sectionOpen: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
  },
  chevronHit: {
    paddingLeft: spacing.sm2,
    paddingVertical: spacing.xs,
    flexGrow: 0,
    flexShrink: 0,
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
  chevronOpen: { ...CHEVRON, transform: [{ rotate: '45deg' }] },
  chevronClosed: { ...CHEVRON, transform: [{ rotate: '-45deg' }] },
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
