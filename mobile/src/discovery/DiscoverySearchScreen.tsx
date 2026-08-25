import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import {
  useSearchSuggestions,
  useTrendingDestinations,
} from '../query/discoveryQueries';
import { colors, spacing } from '../theme';
import {
  discoveryColors,
  discoveryMetrics,
  discoveryTypography,
  profileColors,
  profileMetrics,
  profileTypography,
  publicProfileMotion,
  workspaceColors,
} from '../theme/workspaceTokens';
import {
  RECENT_CLEAR_LABEL,
  RECENT_SECTION_LABEL,
  SEARCH_CANCEL_LABEL,
  SEE_ALL_LABEL,
  SEARCH_PLACEHOLDER,
  SUGGESTED_DESTINATIONS_LABEL,
  SUGGESTED_ITINERARIES_LABEL,
  SUGGESTED_SECTION_LABEL,
} from './discoveryCopy';
import { RowEntrance } from '../members/RowEntrance';
import { PersonRow, handleLabel } from '../profile/PersonRow';
import { trackPeopleResultTapped } from '../profile/profileEvents';
import { PEOPLE_GROUP_LABEL, SEE_ALL_PEOPLE_LABEL } from '../profile/publicProfileCopy';
import { peopleResultsRoute, publicProfileRoute } from '../profile/travelerRoutes';
import { resultsRoute } from './discoveryRoutes';
import { clearedRecents, forgetSearch, rememberSearch } from './recentSearches';
import { loadRecents, saveRecents } from './recentsStore';
import { SEARCH_DEBOUNCE_MS, submittableQuery } from './searchGating';
import { useDebounced } from './useDebounced';

export function DiscoverySearchScreen() {
  const insets = useSafeAreaInsets();
  const [typed, setTyped] = useState('');
  const [recents, setRecents] = useState<string[]>([]);

  const suggestions = useSearchSuggestions(useDebounced(typed, SEARCH_DEBOUNCE_MS));
  const trending = useTrendingDestinations();

  useEffect(() => {
    void loadRecents().then(setRecents);
  }, []);

  function runSearch(query: string) {
    const submittable = submittableQuery(query);
    if (submittable === null) {
      return;
    }
    Keyboard.dismiss();
    const remembered = rememberSearch(recents, submittable);
    setRecents(remembered);
    void saveRecents(remembered);
    router.replace(
      resultsRoute({ query: submittable, destination: null, duration: null }),
    );
  }

  function openDestination(destination: string) {
    Keyboard.dismiss();
    router.replace(resultsRoute({ query: null, destination, duration: null }));
  }

  function openPeople(query: string) {
    const submittable = submittableQuery(query);
    if (submittable === null) {
      return;
    }
    Keyboard.dismiss();
    router.push(peopleResultsRoute(submittable));
  }

  const suggestedDestinations = suggestions.data?.destinations ?? [];
  const suggestedItineraries = suggestions.data?.itineraries ?? [];
  const suggestedPeople = suggestions.data?.people ?? [];
  const morePeople = suggestions.data?.morePeople ?? false;
  const typing = typed.trim() !== "";

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.searchRow}>
        <View style={styles.field}>
          <Icon name="search" size={18} color={profileColors.meta} />
          <TextInput
            style={styles.input}
            value={typed}
            onChangeText={setTyped}
            placeholder={SEARCH_PLACEHOLDER}
            placeholderTextColor={workspaceColors.placeholder}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => runSearch(typed)}
            accessibilityLabel={SEARCH_PLACEHOLDER}
          />
        </View>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={SEARCH_CANCEL_LABEL}
        >
          <Text style={styles.cancel}>{SEARCH_CANCEL_LABEL}</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {typing ? (
          <>
            {suggestedPeople.length > 0 && (
              <View style={styles.group}>
                <Text style={styles.groupLabel}>{PEOPLE_GROUP_LABEL}</Text>
                {suggestedPeople.map((person, index) => (
                  <RowEntrance
                    key={person.id}
                    replayKey={person.id}
                    durationMs={publicProfileMotion.suggestionRiseMs}
                    risePx={publicProfileMotion.suggestionRisePx}
                    delayMs={Math.min(index, publicProfileMotion.suggestionCap - 1) * publicProfileMotion.suggestionStepMs}
                  >
                  <PersonRow
                    person={person}
                    compact
                    onPress={() => {
                      if (person.handle === null) return;
                      trackPeopleResultTapped(person.id, 'suggestions');
                      Keyboard.dismiss();
                      router.push(publicProfileRoute(person.handle));
                    }}
                  />
                  </RowEntrance>
                ))}
                {morePeople && (
                <Pressable
                  style={styles.seeAllPeople}
                  onPress={() => openPeople(typed)}
                  accessibilityRole="button"
                  accessibilityLabel={SEE_ALL_PEOPLE_LABEL}
                >
                  <View style={styles.seeAllCircle}>
                    <Icon name="chevronRight" size={15} color={profileColors.meta} />
                  </View>
                  <Text style={styles.seeAllLabel}>{SEE_ALL_PEOPLE_LABEL}</Text>
                </Pressable>
                )}
              </View>
            )}

            {suggestedDestinations.length > 0 && (
              <View style={styles.group}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupLabel}>
                    {SUGGESTED_DESTINATIONS_LABEL}
                  </Text>
                  <Pressable
                    onPress={() => openDestination(suggestedDestinations[0] ?? '')}
                    accessibilityRole="button"
                    accessibilityLabel={`See all destinations matching ${typed.trim()}`}
                  >
                    <Text style={styles.clear}>{SEE_ALL_LABEL}</Text>
                  </Pressable>
                </View>
                {suggestedDestinations.map((destination) => (
                  <Pressable
                    key={destination}
                    style={styles.row}
                    onPress={() => openDestination(destination)}
                    accessibilityRole="button"
                    accessibilityLabel={`Browse itineraries in ${destination}`}
                  >
                    <Icon
                      name="search"
                      size={15}
                      color={profileColors.chevron}
                    />
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {destination}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {suggestedItineraries.length > 0 && (
              <View style={styles.group}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupLabel}>
                    {SUGGESTED_ITINERARIES_LABEL}
                  </Text>
                  <Pressable
                    onPress={() => runSearch(typed)}
                    accessibilityRole="button"
                    accessibilityLabel={`See all itineraries matching ${typed.trim()}`}
                  >
                    <Text style={styles.clear}>{SEE_ALL_LABEL}</Text>
                  </Pressable>
                </View>
                {suggestedItineraries.map((title) => (
                  <Pressable
                    key={title}
                    style={styles.row}
                    onPress={() => runSearch(title)}
                    accessibilityRole="button"
                    accessibilityLabel={`Search for ${title}`}
                  >
                    <Icon
                      name="search"
                      size={15}
                      color={profileColors.chevron}
                    />
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {recents.length > 0 && (
              <View style={styles.group}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupLabel}>{RECENT_SECTION_LABEL}</Text>
                  <Pressable
                    onPress={() => {
                      setRecents(clearedRecents());
                      void saveRecents(clearedRecents());
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear all recent searches"
                  >
                    <Text style={styles.clear}>{RECENT_CLEAR_LABEL}</Text>
                  </Pressable>
                </View>

                {recents.map((query) => (
                  <View key={query} style={styles.row}>
                    <Icon
                      name="search"
                      size={15}
                      color={profileColors.chevron}
                    />
                    <Pressable
                      style={styles.rowTap}
                      onPress={() => runSearch(query)}
                      accessibilityRole="button"
                      accessibilityLabel={`Search again for ${query}`}
                    >
                      <Text style={styles.rowLabel} numberOfLines={1}>
                        {query}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        const kept = forgetSearch(recents, query);
                        setRecents(kept);
                        void saveRecents(kept);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Forget the search for ${query}`}
                    >
                      <Icon
                        name="close"
                        size={12}
                        color={profileColors.chevron}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.group}>
              <Text style={styles.groupLabel}>{SUGGESTED_SECTION_LABEL}</Text>
              <View style={styles.chips}>
                {(trending.data ?? []).map((entry) => (
                  <Pressable
                    key={entry.destination}
                    style={styles.chip}
                    onPress={() => openDestination(entry.destination)}
                    accessibilityRole="button"
                    accessibilityLabel={`Browse itineraries in ${entry.destination}`}
                  >
                    <Text style={styles.chipLabel}>{entry.destination}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: workspaceColors.surface,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    paddingHorizontal: spacing.md2,
    paddingVertical: spacing.sm3,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm3,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm2,
    backgroundColor: workspaceColors.pressed,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: profileMetrics.statsRadius,
  },
  input: {
    flex: 1,
    ...discoveryTypography.searchField,
    color: workspaceColors.title,
  },
  cancel: {
    ...profileTypography.editPill,
    color: colors.accent,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing.md2,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  group: {
    gap: spacing.xs,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  groupLabel: {
    ...discoveryTypography.sectionEyebrow,
    color: profileColors.chevron,
    textTransform: 'uppercase',
    paddingBottom: spacing.sm,
  },
  clear: {
    ...profileTypography.sectionMeta,
    fontWeight: '700',
    color: colors.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm3,
    paddingVertical: spacing.sm3,
    borderBottomWidth: 1,
    borderBottomColor: workspaceColors.hairline,
  },
  rowTap: {
    flex: 1,
  },
  seeAllPeople: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm3,
    paddingVertical: spacing.sm2,
    paddingHorizontal: spacing.sm3,
  },
  seeAllCircle: {
    width: profileMetrics.personSuggestion,
    height: profileMetrics.personSuggestion,
    borderRadius: profileMetrics.personSuggestion / 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: profileColors.rowChevron,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllLabel: {
    ...profileTypography.editPill,
    color: profileColors.avatarInk,
  },
  rowLabel: {
    ...discoveryTypography.searchField,
    color: workspaceColors.title,
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.sm3,
    paddingVertical: spacing.sm,
    backgroundColor: workspaceColors.pressed,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: discoveryMetrics.pillRadius,
  },
  chipLabel: {
    ...profileTypography.sectionMeta,
    fontWeight: '600',
    color: profileColors.bio,
  },
});
