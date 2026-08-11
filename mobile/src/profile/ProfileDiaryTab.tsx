import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Postcard } from '../diary/Postcard';
import { inTripDayOrder, tripEntryCountLabel } from '../diary/postcardAnatomy';
import { useMyDiaryEntries, useMyDiaryTrips } from '../query/diaryQueries';
import { colors, spacing } from '../theme';
import {
  profileColors,
  profileMetrics,
  profileTypography,
  workspaceColors,
} from '../theme/workspaceTokens';
import { PROFILE_DIARY_EMPTY } from './profileCopy';
import { isExpanded, toggleExpanded } from './profileViewState';
import { stubLikeCount } from './stubMetrics';
import type { DiaryTripResponse } from '../types/api';


export function ProfileDiaryTab() {
  const trips = useMyDiaryTrips();
  const rows = (trips.data?.pages ?? []).flatMap((page) => page.items);

  if (trips.isPending) {
    return <ActivityIndicator style={styles.loading} color={colors.accent} />;
  }

  return (
    <View style={styles.pane}>
      {rows.length === 0 ? (
        <Text style={styles.empty}>{PROFILE_DIARY_EMPTY}</Text>
      ) : (
        rows.map((trip, index) => (
          <TripSection key={trip.itineraryId} trip={trip} first={index === 0} />
        ))
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

  return (
    <View style={styles.section}>
      <Pressable
        style={styles.sectionHeader}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${trip.title ?? 'Untitled trip'}, ${tripEntryCountLabel(trip.entryCount)}`}
      >
        <View style={styles.thumb} />
        <View style={styles.sectionText}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            {trip.title ?? 'Untitled trip'}
          </Text>
          <Text style={styles.sectionMeta}>{tripEntryCountLabel(trip.entryCount)}</Text>
        </View>
        <View style={open ? styles.chevronOpen : styles.chevronClosed} />
      </Pressable>

      {open && (
        <View style={styles.sectionBody}>
          {entries.isPending ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            postcards.map((entry) => (
              <Postcard
                key={entry.id}
                entry={entry}
                likes={stubLikeCount()}
                onPress={() =>
                  router.push({
                    pathname: '/itineraries/[id]/diary/[entryId]',
                    params: { id: trip.itineraryId, entryId: entry.id },
                  })
                }
              />
            ))
          )}
        </View>
      )}
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
  chevronOpen: { ...CHEVRON, transform: [{ rotate: '45deg' }] },
  chevronClosed: { ...CHEVRON, transform: [{ rotate: '-45deg' }] },
  sectionBody: {
    paddingHorizontal: spacing.sm3,
    paddingBottom: spacing.sm3,
    gap: spacing.sm3,
  },
});
