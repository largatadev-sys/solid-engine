import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../../src/api/ApiError';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { missingItineraryMessage } from '../../../src/components/missingItineraryMessage';
import { PublishedItineraryView } from '../../../src/itineraries/PublishedItineraryView';
import { usePublishedItinerary } from '../../../src/query/itineraryQueries';
import { colors, spacing, typography } from '../../../src/theme';


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
    const missing = error instanceof ApiError && error.code === 'ITINERARY_NOT_FOUND';
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>
          {missing ? missingItineraryMessage.title : 'Could not load this itinerary'}
        </Text>
        <Text style={styles.caption}>{missing ? missingItineraryMessage.body : error.message}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader title="" back />
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
  errorTitle: { ...typography.heading, color: colors.danger },
  caption: { ...typography.caption, color: colors.textSecondary },
});
