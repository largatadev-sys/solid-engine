import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { TripRow } from '../../../../src/itineraries/TripRow';
import { useArchivedItineraries } from '../../../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../../../src/theme';


export default function ArchivedTripsScreen() {
  const { data, isPending, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useArchivedItineraries();

  const itineraries = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <View style={styles.container}>
      <ScreenHeader title="Archived Trips" back />

      {isPending && <ActivityIndicator size="large" color={colors.accent} style={styles.centered} />}

      {isError && (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Could not load your archived trips</Text>
          <Text style={styles.caption}>{error.message}</Text>
          <Pressable style={styles.button} onPress={() => void refetch()} accessibilityRole="button">
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {!isPending && !isError && (
        <FlatList
          data={itineraries}
          keyExtractor={(itinerary) => itinerary.id}
          contentContainerStyle={itineraries.length === 0 ? styles.emptyContainer : styles.listContainer}
          renderItem={({ item }) => <TripRow itinerary={item} />}
          onRefresh={() => void refetch()}
          refreshing={isRefetching}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<EmptyState />}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={styles.footer} /> : null
          }
        />
      )}
    </View>
  );
}


function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Nothing archived</Text>
      <Text style={styles.caption}>
        Archiving a trip clears it from My Trips without deleting anything. Archived trips are read-only,
        and the owner can bring them back at any time.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  listContainer: { padding: spacing.md, gap: spacing.sm },
  emptyContainer: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  emptyTitle: { ...typography.title, color: colors.textPrimary },
  errorTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  caption: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  buttonText: { ...typography.bodyStrong, color: colors.accent },
  footer: { paddingVertical: spacing.md },
});
