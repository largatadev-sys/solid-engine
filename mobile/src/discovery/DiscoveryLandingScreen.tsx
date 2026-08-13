import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { useRecommended } from '../query/discoveryQueries';
import { colors, spacing } from '../theme';
import { profileColors, profileMetrics, profileTypography, workspaceColors } from '../theme/workspaceTokens';
import type { DiscoveryCardResponse } from '../types/api';
import { RecommendedRail } from './RecommendedRail';
import { publishedItineraryRoute } from './discoveryCardCopy';
import {
  LANDING_EMPTY_BODY,
  LANDING_EMPTY_TITLE,
  SEARCH_PLACEHOLDER,
} from './discoveryCopy';
import { DISCOVERY_RESULTS_ROUTE } from './discoveryRoutes';


export function DiscoveryLandingScreen() {
  const recommended = useRecommended();
  const insets = useSafeAreaInsets();

  const cards = recommended.data ?? [];
  const settled = !recommended.isPending;
  const nothingAnywhere = settled && !recommended.isError && cards.length === 0;

  function openCard(card: DiscoveryCardResponse) {
    router.push(publishedItineraryRoute(card.id));
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm3 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.searchRow}>
        <Pressable
          style={styles.searchBar}
          onPress={() => router.push(DISCOVERY_RESULTS_ROUTE)}
          accessibilityRole="button"
          accessibilityLabel={SEARCH_PLACEHOLDER}
        >
          <Icon name="search" size={18} color={profileColors.meta} />
          <Text style={styles.searchLabel}>{SEARCH_PLACEHOLDER}</Text>
        </Pressable>
      </View>

      {nothingAnywhere ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{LANDING_EMPTY_TITLE}</Text>
          <Text style={styles.emptyBody}>{LANDING_EMPTY_BODY}</Text>
        </View>
      ) : (
        <RecommendedRail
          cards={cards}
          loading={recommended.isPending}
          failed={recommended.isError}
          onRetry={() => void recommended.refetch()}
          onOpenCard={openCard}
          onSeeAll={() => router.push(DISCOVERY_RESULTS_ROUTE)}
        />
      )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: spacing.sm3,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  searchRow: {
    paddingHorizontal: spacing.md2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm3,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm3 + 2,
    backgroundColor: workspaceColors.pressed,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: profileMetrics.statsRadius,
  },
  searchLabel: {
    ...profileTypography.meta,
    fontSize: 15,
    color: profileColors.meta,
  },
  empty: {
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.xxl,
    gap: spacing.sm,
    alignItems: 'center',
  },
  emptyTitle: {
    ...profileTypography.sectionTitle,
    color: workspaceColors.title,
  },
  emptyBody: {
    ...profileTypography.sectionMeta,
    color: profileColors.meta,
    textAlign: 'center',
  },
});
