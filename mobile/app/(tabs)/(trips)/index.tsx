import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { comingSoon } from '../../../src/components/comingSoon';
import { InvitationInbox } from '../../../src/components/InvitationInbox';
import { TripRow } from '../../../src/itineraries/TripRow';
import { groupIntoSections } from '../../../src/itineraries/tripSections';
import { useMyItineraries } from '../../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../../src/theme';


export default function MyTripsScreen() {
  const { data, isPending, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMyItineraries();

  const itineraries = data?.pages.flatMap((page) => page.items) ?? [];
  const sections = groupIntoSections(itineraries);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trips</Text>
      </View>

      {isPending && <ActivityIndicator size="large" color={colors.accent} style={styles.centered} />}

      {isError && (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Could not load your trips</Text>
          <Text style={styles.caption}>{error.message}</Text>
          <Pressable style={styles.button} onPress={() => void refetch()} accessibilityRole="button">
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {!isPending && !isError && (
        <SectionList
          sections={sections}
          keyExtractor={(itinerary) => itinerary.id}
          contentContainerStyle={sections.length === 0 ? styles.emptyContainer : styles.listContainer}
          renderItem={({ item }) => <TripRow itinerary={item} />}
          renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.label}</Text>}
          stickySectionHeadersEnabled={false}
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
              <Link href="/itineraries/archived" asChild>
                <Pressable style={styles.archivedLink} accessibilityRole="button">
                  <Text style={styles.archivedLinkText}>Archived trips</Text>
                </Pressable>
              </Link>
            </>
          }
        />
      )}

      <View style={styles.ctas}>
        <Link href="/itineraries/new" asChild>
          <Pressable style={styles.primaryCta} accessibilityRole="button">
            <Text style={styles.primaryCtaText}>Create Itinerary</Text>
          </Pressable>
        </Link>
        <Pressable
          style={styles.secondaryCta}
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          onPress={() => comingSoon('addPastTrip')}>
          <Text style={styles.secondaryCtaText}>Add a Past Trip</Text>
        </Pressable>
      </View>
    </View>
  );
}


function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No trips yet</Text>
      <Text style={styles.caption}>
        Every trip starts as a draft. Build the plan, finish planning, then travel it.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerTitle: { ...typography.display, color: colors.textPrimary },
  sectionTitle: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  listContainer: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  emptyContainer: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  emptyTitle: { ...typography.heading, color: colors.textPrimary },
  errorTitle: { ...typography.heading, color: colors.danger },
  caption: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  footer: { paddingVertical: spacing.md },
  archivedLink: { paddingVertical: spacing.md, alignItems: 'center' },
  archivedLinkText: { ...typography.body, color: colors.textSecondary },
  ctas: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  primaryCta: {
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  primaryCtaText: { ...typography.bodyStrong, color: colors.textOnAccent },
  secondaryCta: {
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    opacity: 0.5,
  },
  secondaryCtaText: { ...typography.bodyStrong, color: colors.textSecondary },
  button: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  buttonText: { ...typography.bodyStrong, color: colors.textOnAccent },
});
