import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Icon } from '../components/Icon';
import { itineraryLoadMessage, ScreenMessage } from '../components/ScreenMessage';
import { useSafeBack } from '../navigation/safeBack';
import { MediaThumb } from '../media/MediaThumb';
import { useMyDiaryEntries } from '../query/diaryQueries';
import { useItinerary } from '../query/itineraryQueries';
import { colors, spacing } from '../theme';
import {
  diaryScreenColors,
  diaryScreenMetrics,
  diaryScreenTypography,
  profileColors,
  profileMetrics,
  profileTypography,
} from '../theme/workspaceTokens';
import type { DiaryEntryResponse } from '../types/api';
import { DIARY_STREAM_EMPTY, MY_DIARY_TITLE } from './diaryCopy';
import { entryEditorRoute, type DiaryEntryExit } from './diaryEntryExit';
import {
  dragToScroll,
  PAGING,
  SHOW_SCROLLBAR,
  SNAP_CHILD_STYLE,
  SNAP_STYLE,
} from './photoStripScroll';
import { inTripDayOrder, snapshotEyebrow } from './postcardAnatomy';
import { carouselCounter, pageOfOffset, showsCarouselChrome } from './postcardCarousel';
import { PostcardPreview } from './PostcardPreview';


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
            <StreamEntry key={entry.id} entry={entry} onOpen={() => setPreviewing(entry)} />
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


function StreamEntry({
  entry,
  onOpen,
}: {
  readonly entry: DiaryEntryResponse;
  readonly onOpen: () => void;
}) {
  const [drag] = useState(dragToScroll);
  const [photoWidth, setPhotoWidth] = useState(0);
  const [page, setPage] = useState(0);

  const photoCount = entry.photos.length;
  const chrome = showsCarouselChrome(photoCount);

  const measure = (event: LayoutChangeEvent) => setPhotoWidth(event.nativeEvent.layout.width);

  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(pageOfOffset(event.nativeEvent.contentOffset.x, photoWidth, photoCount));

  return (
    <View style={styles.entry}>
      <Pressable
        style={styles.heading}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Open your entry for ${entry.activityTitle}`}
      >
        <Text style={styles.eyebrow}>{snapshotEyebrow(entry)}</Text>
        <Text style={styles.entryTitle}>{entry.activityTitle}</Text>
      </Pressable>

      <View style={styles.stage}>
        <ScrollView
          horizontal
          {...PAGING}
          style={SNAP_STYLE}
          showsHorizontalScrollIndicator={SHOW_SCROLLBAR}
          onLayout={measure}
          onScroll={settle}
          onMomentumScrollEnd={settle}
          scrollEventThrottle={16}
          {...drag}
        >
          {entry.photos.map((photo, index) => (
            <MediaThumb
              key={photo.id}
              url={photo.url}
              full
              style={{ ...styles.photo, ...SNAP_CHILD_STYLE, width: photoWidth }}
              accessibilityLabel={`${entry.activityTitle}, photo ${index + 1}`}
            />
          ))}
        </ScrollView>

        {chrome && (
          <>
            <View style={styles.counter}>
              <Text style={styles.counterLabel}>{carouselCounter(page, photoCount)}</Text>
            </View>
            <View style={styles.dots}>
              {entry.photos.map((photo, index) => (
                <View key={photo.id} style={index === page ? styles.dotActive : styles.dot} />
              ))}
            </View>
          </>
        )}
      </View>

      {entry.caption !== null && (
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`Open your entry for ${entry.activityTitle}`}
        >
          <Text style={styles.caption}>{entry.caption}</Text>
        </Pressable>
      )}
    </View>
  );
}


const STREAM_INSET = spacing.md2;

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
  entry: {
    gap: spacing.sm,
    paddingHorizontal: STREAM_INSET,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: diaryScreenColors.divider,
  },
  heading: {
    gap: spacing.sm,
  },
  eyebrow: {
    ...diaryScreenTypography.eyebrow,
    color: diaryScreenColors.eyebrow,
  },
  entryTitle: {
    ...diaryScreenTypography.entryTitle,
    color: diaryScreenColors.caption,
  },
  stage: {
    marginHorizontal: -STREAM_INSET,
  },
  photo: {
    height: diaryScreenMetrics.streamPhotoHeight,
    backgroundColor: diaryScreenColors.photoWell,
  },
  counter: {
    position: 'absolute',
    top: profileMetrics.pillInset,
    right: profileMetrics.pillInset,
    backgroundColor: profileColors.counterPill,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  counterLabel: {
    ...profileTypography.counter,
    color: profileColors.onPill,
  },
  dots: {
    position: 'absolute',
    bottom: profileMetrics.pillInset,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: profileMetrics.dotSize,
    height: profileMetrics.dotSize,
    borderRadius: profileMetrics.dotSize / 2,
    backgroundColor: profileColors.dotIdle,
  },
  dotActive: {
    width: profileMetrics.dotSize,
    height: profileMetrics.dotSize,
    borderRadius: profileMetrics.dotSize / 2,
    backgroundColor: profileColors.dotActive,
  },
  caption: {
    ...diaryScreenTypography.caption,
    color: diaryScreenColors.caption,
  },
});
