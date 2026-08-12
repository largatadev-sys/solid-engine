import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { itineraryLoadMessage, ScreenMessage } from '../components/ScreenMessage';
import { PublishedItineraryView } from './PublishedItineraryView';
import { publishedBackRoute, type PublishedExit } from './publishedExit';
import { usePublishedItinerary } from '../query/itineraryQueries';
import { colors, spacing } from '../theme';


export function PublishedItineraryScreen({ exit = 'trip' }: { readonly exit?: PublishedExit } = {}) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, error } = usePublishedItinerary(id);

  if (isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isError) {
    return <ScreenMessage {...itineraryLoadMessage(error, 'Could not load this itinerary')} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader title="" back backTo={publishedBackRoute(exit)} />
      <PublishedItineraryView projection={data} audience="consumer" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.background, flexGrow: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
});
