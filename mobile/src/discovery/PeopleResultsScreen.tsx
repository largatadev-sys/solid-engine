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
  profileColors,
  profileMetrics,
  profileTypography,
  publicProfileMotion,
  workspaceColors,
} from '../theme/workspaceTokens';
import { fetchesMore } from './resultsPaging';
import { SearchFieldRow, SEARCH_GLYPH, searchFieldStyles } from './SearchField';


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
      <SearchFieldRow onBack={goBack} backLabel={PEOPLE_RESULTS_BACK_LABEL}>
        <View style={searchFieldStyles.field}>
          <Icon name="search" size={SEARCH_GLYPH} color={profileColors.meta} />
          <Text style={searchFieldStyles.text} numberOfLines={1}>
            {query}
          </Text>
        </View>
      </SearchFieldRow>

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
