import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../../../../../../src/components/ScreenHeader';
import {
  itineraryLoadMessage,
  ScreenMessage,
} from '../../../../../../src/components/ScreenMessage';
import { DIARY_STREAM_EMPTY, MY_DIARY_TITLE } from '../../../../../../src/diary/diaryCopy';
import { snapshotEyebrow } from '../../../../../../src/diary/postcardAnatomy';
import { MediaThumb } from '../../../../../../src/media/MediaThumb';
import { useMyDiaryEntries } from '../../../../../../src/query/diaryQueries';
import { useItinerary } from '../../../../../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../../../../../src/theme';
import {
  diaryColors,
  diaryMetrics,
  diaryTypography,
  workspaceColors,
} from '../../../../../../src/theme/workspaceTokens';

const PHOTO_HEIGHT = diaryMetrics.postcardPhotoHeight;


export default function TripDiaryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const trip = useItinerary(id);
  const entries = useMyDiaryEntries(id, true);

  if (entries.isPending) {
    return <ActivityIndicator style={styles.loading} color={colors.accent} />;
  }
  if (entries.isError) {
    return <ScreenMessage {...itineraryLoadMessage(entries.error, 'Diary unavailable')} />;
  }

  const postcards = entries.data;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={trip.data?.title ?? MY_DIARY_TITLE}
        size="heading"
        back
        eyebrow={<Text style={styles.eyebrowLabel}>{MY_DIARY_TITLE}</Text>}
      />

      <ScrollView contentContainerStyle={styles.body}>
        {postcards.length === 0 ? (
          <Text style={styles.empty}>{DIARY_STREAM_EMPTY}</Text>
        ) : (
          postcards.map((entry) => (
            <Pressable
              key={entry.id}
              style={styles.postcard}
              onPress={() =>
                router.push({
                  pathname: '/itineraries/[id]/diary/[entryId]',
                  params: { id, entryId: entry.id },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Open your entry for ${entry.activityTitle}`}
            >
              <Text style={styles.eyebrow}>{snapshotEyebrow(entry)}</Text>
              <Text style={styles.title}>{entry.activityTitle}</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.photos}>
                  {entry.photos.map((photo, index) => (
                    <MediaThumb
                      key={photo.id}
                      url={photo.url}
                      full
                      style={styles.photo}
                      accessibilityLabel={`${entry.activityTitle}, photo ${index + 1}`}
                    />
                  ))}
                </View>
              </ScrollView>

              {entry.caption !== null ? (
                <Text style={styles.caption}>{entry.caption}</Text>
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loading: {
    marginTop: spacing.xl,
  },
  body: {
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  empty: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  eyebrowLabel: {
    ...typography.overline,
    color: colors.textSecondary,
  },
  postcard: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: workspaceColors.hairline,
  },
  eyebrow: {
    ...diaryTypography.eyebrow,
    color: diaryColors.eyebrow,
  },
  title: {
    ...diaryTypography.postcardTitle,
    color: workspaceColors.title,
  },
  photos: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photo: {
    width: diaryMetrics.postcardPhotoWidth,
    height: PHOTO_HEIGHT,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  caption: {
    ...typography.body,
    lineHeight: 22,
    color: workspaceColors.title,
  },
});
