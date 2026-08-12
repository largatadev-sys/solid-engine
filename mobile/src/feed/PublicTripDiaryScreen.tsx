import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { comingSoon } from '../components/comingSoon';
import { Icon } from '../components/Icon';
import { itineraryLoadMessage, ScreenMessage } from '../components/ScreenMessage';
import { useSafeBack } from '../navigation/safeBack';
import { usePublicTripDiary } from '../query/feedQueries';
import { colors, spacing } from '../theme';
import { feedColors, feedMetrics, feedTypography } from '../theme/feedTokens';
import { diaryScreenColors, diaryScreenMetrics, diaryScreenTypography } from '../theme/workspaceTokens';
import { FeedCard, type StubControl } from './FeedCard';
import { publicDiaryByline } from './feedCardAnatomy';
import { PhotoActionSheet, type PhotoSheetAction } from './PhotoActionSheet';


export function PublicTripDiaryScreen() {
  const insets = useSafeAreaInsets();
  const goBack = useSafeBack();
  const { id, author } = useLocalSearchParams<{ id: string; author: string }>();

  const diary = usePublicTripDiary(id ?? '', author ?? '');
  const [now] = useState(() => Date.now());
  const [pages, setPages] = useState<Record<string, number>>({});
  const [sheetOpen, setSheetOpen] = useState(false);

  if (diary.isPending) {
    return <ActivityIndicator style={styles.loading} color={colors.accent} />;
  }
  if (diary.isError) {
    return <ScreenMessage {...itineraryLoadMessage(diary.error, 'This diary is not public')} />;
  }

  const refuse = (what: StubControl) => {
    if (what === 'author') comingSoon('profile');
    else if (what === 'comment') comingSoon('comments');
    else if (what === 'share') comingSoon('share');
    else if (what === 'save') comingSoon('saved');
    else setSheetOpen(true);
  };

  const chooseFromSheet = (action: PhotoSheetAction) => {
    setSheetOpen(false);
    if (action === 'save') comingSoon('saved');
    else if (action === 'share') comingSoon('share');
    else comingSoon('report');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.back}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="back" size={diaryScreenMetrics.backGlyph} color={diaryScreenColors.title} />
        </Pressable>
        <View style={styles.headings}>
          <Text style={styles.title} numberOfLines={2}>
            {diary.data.tripTitle ?? ''}
          </Text>
          <Text style={styles.byline} numberOfLines={1}>
            {publicDiaryByline(diary.data)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {diary.data.postcards.map((card) => (
          <FeedCard
            key={card.id}
            card={card}
            now={now}
            page={pages[card.id] ?? 0}
            onPageChange={(page) => setPages((seen) => ({ ...seen, [card.id]: page }))}
            onOpenTrip={() => undefined}
            onStubTap={refuse}
          />
        ))}
      </ScrollView>

      <PhotoActionSheet
        open={sheetOpen}
        onChoose={chooseFromSheet}
        onDismiss={() => setSheetOpen(false)}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: feedColors.cardSurface,
  },
  loading: {
    marginTop: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: feedMetrics.listInset,
    paddingVertical: spacing.sm3,
    borderBottomWidth: 1,
    borderBottomColor: feedColors.headerRule,
  },
  back: {
    width: diaryScreenMetrics.backButton,
    height: diaryScreenMetrics.backButton,
    borderRadius: diaryScreenMetrics.backButton / 2,
    borderWidth: 1,
    borderColor: diaryScreenColors.backBorder,
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
    gap: feedMetrics.cardGap,
    padding: feedMetrics.listInset,
    paddingBottom: spacing.xl,
  },
});
