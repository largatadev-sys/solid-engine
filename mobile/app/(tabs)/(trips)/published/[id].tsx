import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { itineraryLoadMessage, ScreenMessage } from '../../../../src/components/ScreenMessage';
import { PublishedItineraryView } from '../../../../src/itineraries/PublishedItineraryView';
import { usePublishedItinerary } from '../../../../src/query/itineraryQueries';
import { colors, spacing, typography } from '../../../../src/theme';


export default function PublishedItineraryScreen() {
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
      <ScreenHeader title="" back backTo="/" />
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
