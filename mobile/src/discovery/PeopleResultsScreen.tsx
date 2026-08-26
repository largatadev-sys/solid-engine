import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { RowEntrance } from '../members/RowEntrance';
import { useSafeBack } from '../navigation/safeBack';
import { PersonRow } from '../profile/PersonRow';
import {
  PEOPLE_NO_RESULTS_SUPPORT,
  PEOPLE_RESULTS_BACK_LABEL,
  noPeopleMatchTitle,
  peopleCountLabel,
} from '../profile/publicProfileCopy';
import { publicProfileRoute } from '../profile/travelerRoutes';
import { usePeopleSearch } from '../query/discoveryQueries';
import { colors, spacing } from '../theme';
import {
  discoveryTypography,
  profileColors,
  profileMetrics,
  profileTypography,
  publicProfileMotion,
  workspaceColors,
} from '../theme/workspaceTokens';
import { fetchesMore } from './resultsPaging';


export function PeopleResultsScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const insets = useSafeAreaInsets();
  const { q } = useLocalSearchParams<{ q: string }>();
  const query = q ?? '';

  const people = usePeopleSearch(query);
  const pages = people.data?.pages ?? [];
  const rows = pages.flatMap((page) => page.items);
  const matched = pages[0]?.totalCount ?? rows.length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Pressable
          style={styles.back}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={PEOPLE_RESULTS_BACK_LABEL}
        >
          <Icon name="back" size={20} color={workspaceColors.title} />
        </Pressable>
        <View style={styles.field}>
          <Icon name="search" size={16} color={profileColors.meta} />
          <Text style={styles.query} numberOfLines={1}>
            {query}
          </Text>
        </View>
      </View>

      {people.isPending ? (
        <ActivityIndicator style={styles.loading} color={colors.accent} />
      ) : rows.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyCircle}>
            <Icon
              name="personSearch"
              size={profileMetrics.noResultsGlyph}
              color={workspaceColors.accent}
            />
          </View>
          <Text style={styles.emptyTitle}>{noPeopleMatchTitle(query)}</Text>
          <Text style={styles.emptyBody}>{PEOPLE_NO_RESULTS_SUPPORT}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.count}>{peopleCountLabel(matched)}</Text>
          <FlatList
            data={rows}
            keyExtractor={(person) => person.id}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <RowEntrance
                replayKey={item.id}
                durationMs={publicProfileMotion.resultRiseMs}
                risePx={publicProfileMotion.resultRisePx}
                delayMs={index < publicProfileMotion.resultCap ? index * publicProfileMotion.resultStepMs : 0}
              >
              <PersonRow
                person={item}
                onPress={() => {
                  if (item.handle !== null) {
                    router.push(publicProfileRoute(item.handle));
                  }
                }}
              />
              </RowEntrance>
            )}
            onEndReachedThreshold={0.5}
            onEndReached={() => {
              if (
                fetchesMore(
                  rows.length - 1,
                  rows.length,
                  people.hasNextPage === true,
                  people.isFetchingNextPage,
                )
              ) {
                void people.fetchNextPage();
              }
            }}
          />
        </>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: workspaceColors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.sm3,
    paddingBottom: spacing.sm2,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm3,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm3,
    backgroundColor: workspaceColors.pressed,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: profileMetrics.statsRadius,
  },
  query: {
    flex: 1,
    ...discoveryTypography.searchField,
    color: workspaceColors.title,
  },
  count: {
    ...profileTypography.countLine,
    color: profileColors.meta,
    paddingHorizontal: spacing.md2,
    paddingBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
  },
  loading: {
    marginTop: spacing.xl,
  },
  empty: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm2,
  },
  emptyCircle: {
    width: profileMetrics.noResultsCircle,
    height: profileMetrics.noResultsCircle,
    borderRadius: profileMetrics.noResultsCircle / 2,
    backgroundColor: profileColors.emptyWell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...profileTypography.emptyTitle,
    color: workspaceColors.title,
  },
  emptyBody: {
    ...profileTypography.emptyBody,
    color: profileColors.meta,
    textAlign: 'center',
    maxWidth: profileMetrics.noResultsBodyWidth,
  },
});
