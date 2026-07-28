import { Stack } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { TripRow } from '../../src/itineraries/TripRow';
import { useArchivedItineraries } from '../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../src/theme';

/**
 * Archived trips (S1.9) — My Trips asking the other half of the question.
 *
 * <p><strong>Its own route rather than a toggle on My Trips</strong>, for two reasons. The two views
 * are separate cache entries with independent cursors, so a toggle would have to reset paging state on
 * every flip; and archiving is meant to make the main list shorter, which a filter chip sitting
 * permanently at its top quietly undoes.
 *
 * <p><strong>Members reach it too, not just owners.</strong> An archived trip stays visible to everyone
 * on it — hiding it from members would repeat, one level up, the failure S1.5 had to fix in copy: a
 * trip vanishing with no explanation reads as data loss rather than a state change. They see it, and
 * the trip screen tells them why it is frozen.
 *
 * <p>Rows are the shared {@link TripRow}, so an archived trip's card is identical to a live one's
 * except for the badge that distinguishes them — the point of extracting it.
 */
export default function ArchivedTripsScreen() {
  const { data, isPending, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useArchivedItineraries();

  const itineraries = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Archived trips' }} />

      {isPending && <ActivityIndicator size="large" color={colors.accent} style={styles.centered} />}

      {isError && (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Could not load your archived trips</Text>
          {/* Branching on `code`, never on `message` (Artifact 05). */}
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
          // The cursor stays in the query layer here as everywhere (Artifact 05 — opaque to clients).
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

/**
 * The empty state explains what archiving is *for*, because the likeliest visitor here is someone who
 * followed the link to find out — not someone looking for a trip they know is here.
 */
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
