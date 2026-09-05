import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { itineraryLoadMessage, ScreenMessage } from '../components/ScreenMessage';
import { useSafeBack } from '../navigation/safeBack';
import { useMyDiaryEntries } from '../query/diaryQueries';
import { useItinerary } from '../query/itineraryQueries';
import { colors, spacing } from '../theme';
import {
  diaryScreenColors,
  diaryScreenMetrics,
  diaryScreenTypography,
} from '../theme/workspaceTokens';
import type { DiaryEntryResponse } from '../types/api';
import { DIARY_STREAM_EMPTY, MY_DIARY_TITLE } from './diaryCopy';
import { entryEditorRoute, type DiaryEntryExit } from './diaryEntryExit';
import { inTripDayOrder, snapshotEyebrow } from './postcardAnatomy';
import { PostcardPreview } from './PostcardPreview';
import { PostcardStreamEntry, STREAM_INSET } from './PostcardStreamEntry';


export function TripDiaryScreen({ exit = 'trip' }: { readonly exit?: DiaryEntryExit } = {}) {
  const router = useRouter();
  const goBack = useSafeBack();
  const { id } = useLocalSearchParams<{ id: string }>();

  const trip = useItinerary(id);
  const entries = useMyDiaryEntries(id, true);
  const [previewing, setPreviewing] = useState<DiaryEntryResponse | null>(null);

  if (entries.isPending) {
    return <ActivityIndicator style={styles.loading} color={colors.accent} />;
  }
  if (entries.isError) {
    return <ScreenMessage {...itineraryLoadMessage(entries.error, 'Diary unavailable')} />;
  }

  const postcards = inTripDayOrder(entries.data);
  const tripTitle = trip.data?.title ?? null;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Pressable
            style={styles.back}
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon
              name="back"
              size={diaryScreenMetrics.backGlyph}
              color={diaryScreenColors.title}
            />
          </Pressable>
          <Text style={styles.title} numberOfLines={2}>
            {tripTitle ?? MY_DIARY_TITLE}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {postcards.length === 0 ? (
          <Text style={styles.empty}>{DIARY_STREAM_EMPTY}</Text>
        ) : (
          postcards.map((entry) => (
            <PostcardStreamEntry
              key={entry.id}
              postcard={entry}
              eyebrow={snapshotEyebrow(entry)}
              openLabel={`Open your entry for ${entry.activityTitle}`}
              destination={trip.data?.destination ?? null}
              onOpen={() => setPreviewing(entry)}
            />
          ))
        )}
      </ScrollView>

      <PostcardPreview
        entry={previewing}
        tripTitle={tripTitle}
        onEdit={(entry) => {
          setPreviewing(null);
          router.push(entryEditorRoute(exit, id, entry.id));
        }}
        onDismiss={() => setPreviewing(null)}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: diaryScreenColors.card,
  },
  loading: {
    marginTop: spacing.xl,
  },
  header: {
    paddingHorizontal: STREAM_INSET,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  back: {
    width: diaryScreenMetrics.backButton,
    height: diaryScreenMetrics.backButton,
    borderRadius: diaryScreenMetrics.backButton / 2,
    borderWidth: 1,
    borderColor: diaryScreenColors.backBorder,
    backgroundColor: diaryScreenColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  title: {
    ...diaryScreenTypography.screenTitle,
    color: diaryScreenColors.title,
    flex: 1,
  },
  body: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: diaryScreenMetrics.entryGap,
  },
  empty: {
    ...diaryScreenTypography.caption,
    color: diaryScreenColors.overline,
    paddingHorizontal: STREAM_INSET,
  },
});
