import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { itineraryLoadMessage, ScreenMessage } from '../components/ScreenMessage';
import { isProfilePrivate } from '../profile/gatedRead';
import { LockedProfileNotice } from '../profile/LockedProfileNotice';
import { PostcardPreview } from '../diary/PostcardPreview';
import { PostcardStreamEntry, STREAM_INSET } from '../diary/PostcardStreamEntry';
import { snapshotEyebrow } from '../diary/postcardAnatomy';
import { useSafeBack } from '../navigation/safeBack';
import { usePublicTripDiary } from '../query/feedQueries';
import { colors, spacing } from '../theme';
import { feedColors, feedTypography } from '../theme/feedTokens';
import { diaryScreenColors, diaryScreenMetrics, diaryScreenTypography } from '../theme/workspaceTokens';
import type { DiaryEntryResponse } from '../types/api';
import { publicDiaryByline } from './feedCardAnatomy';
import { asDiaryEntry, tripDestinationOf } from './publicDiaryPostcard';


export function PublicTripDiaryScreen() {
  const goBack = useSafeBack();
  const { id, author, handle, name } = useLocalSearchParams<{
    id: string;
    author: string;
    handle?: string;
    name?: string;
  }>();

  const diary = usePublicTripDiary(id ?? '', author ?? '');
  const [previewing, setPreviewing] = useState<DiaryEntryResponse | null>(null);

  if (diary.isPending) {
    return <ActivityIndicator style={styles.loading} color={colors.accent} />;
  }
  if (diary.isError) {
    if (isProfilePrivate(diary.error)) {
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
            </View>
          </View>
          <LockedProfileNotice
            displayName={name === undefined || name === '' ? null : name}
            handle={handle === undefined || handle === '' ? null : handle}
            linked={handle !== undefined && handle !== ''}
          />
        </View>
      );
    }
    return <ScreenMessage {...itineraryLoadMessage(diary.error, 'This diary is not public')} />;
  }

  const tripTitle = diary.data.tripTitle;
  const destination = tripDestinationOf(diary.data.postcards);
  const postcards = diary.data.postcards.map(asDiaryEntry);

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
          <View style={styles.headings}>
            <Text style={styles.title} numberOfLines={2}>
              {tripTitle ?? ''}
            </Text>
            <Text style={styles.byline} numberOfLines={1}>
              {publicDiaryByline(diary.data)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {postcards.map((entry) => (
          <PostcardStreamEntry
            key={entry.id}
            postcard={entry}
            eyebrow={snapshotEyebrow(entry)}
            openLabel={`Open this postcard from ${entry.activityTitle}`}
            destination={destination}
            onOpen={() => setPreviewing(entry)}
          />
        ))}
      </ScrollView>

      <PostcardPreview
        entry={previewing}
        tripTitle={tripTitle}
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
  headings: {
    flex: 1,
    gap: spacing.hair,
  },
  title: {
    ...diaryScreenTypography.screenTitle,
    color: diaryScreenColors.title,
  },
  byline: {
    ...feedTypography.tripLine,
    color: feedColors.tripLine,
  },
  body: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: diaryScreenMetrics.entryGap,
  },
});
