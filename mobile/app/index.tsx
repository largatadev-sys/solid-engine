import { Link, Stack } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomNav } from '../src/components/BottomNav';
import { InvitationInbox } from '../src/components/InvitationInbox';
import { TripRow } from '../src/itineraries/TripRow';
import { useMyItineraries } from '../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../src/theme';


export default function MyTripsScreen() {
  const { data, isPending, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMyItineraries();

  const itineraries = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'My Trips',
          headerLeft: () => (
            <Link href="/me" asChild>
              <Pressable accessibilityRole="button" accessibilityLabel="Your account" hitSlop={spacing.sm}>
                <Text style={styles.headerActionMuted}>Account</Text>
              </Pressable>
            </Link>
          ),
          headerRight: () => (
            <Link href="/itineraries/new" asChild>
              <Pressable accessibilityRole="button" accessibilityLabel="Plan a trip" hitSlop={spacing.sm}>
                <Text style={styles.headerAction}>Plan</Text>
              </Pressable>
            </Link>
          ),
        }}
      />

      {isPending && <ActivityIndicator size="large" color={colors.accent} style={styles.centered} />}

      {isError && (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Could not load your trips</Text>
          {}
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
          ListHeaderComponent={<InvitationInbox />}
          ListEmptyComponent={<EmptyState />}
          ListFooterComponent={
            <>
              {isFetchingNextPage && <ActivityIndicator color={colors.accent} style={styles.footer} />}
              {}
              <Link href="/itineraries/archived" asChild>
                <Pressable style={styles.archivedLink} accessibilityRole="button">
                  <Text style={styles.archivedLinkText}>Archived trips</Text>
                </Pressable>
              </Link>
            </>
          }
        />
      )}

      {}
      <BottomNav active="trips" />
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No trips yet</Text>
      <Text style={styles.caption}>Every trip starts as a draft. Plan your first one.</Text>
      <Link href="/itineraries/new" asChild>
        <Pressable style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonText}>Plan a trip</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  headerAction: { ...typography.bodyStrong, color: colors.accent, paddingHorizontal: spacing.sm },
  headerActionMuted: { ...typography.body, color: colors.textSecondary, paddingHorizontal: spacing.sm },
  listContainer: { padding: spacing.md, gap: spacing.sm },
  emptyContainer: { flexGrow: 1 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowTitle: { ...typography.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
  stateBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.surface,
  },
  stateBadgeText: { ...typography.overline, color: colors.textSecondary },
  rowMeta: { ...typography.caption, color: colors.textSecondary },
  rowDates: { ...typography.caption, color: colors.textSecondary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  emptyTitle: { ...typography.heading, color: colors.textPrimary },
  errorTitle: { ...typography.heading, color: colors.danger },
  caption: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  footer: { paddingVertical: spacing.md },
  archivedLink: { paddingVertical: spacing.md, alignItems: 'center' },
  archivedLinkText: { ...typography.body, color: colors.textSecondary },
  button: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  buttonText: { ...typography.bodyStrong, color: colors.textOnAccent },
});
