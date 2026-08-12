import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { comingSoon } from '../../../src/components/comingSoon';
import { Icon } from '../../../src/components/Icon';
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
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => comingSoon('tripSearch')}
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            accessibilityLabel="Search trips, coming soon"
            hitSlop={8}>
            <Icon name="search" size={HEADER_ICON_SIZE} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            onPress={() => comingSoon('tripFilter')}
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            accessibilityLabel="Filter trips, coming soon"
            hitSlop={8}>
            <Icon name="filter" size={HEADER_ICON_SIZE} color={colors.textPrimary} />
          </Pressable>
        </View>
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
            isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={styles.footer} /> : null
          }
        />
      )}

      <View style={styles.ctas}>
        <Link href="/itineraries/new" asChild>
          <Pressable style={styles.primaryCta} accessibilityRole="button">
            <Text style={styles.primaryCtaText}>Plan a Trip</Text>
            <Icon name="plusCircle" size={CTA_ICON_SIZE} color={colors.textOnAccent} />
          </Pressable>
        </Link>
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

const HEADER_ICON_SIZE = 20;

const CTA_ICON_SIZE = 18;

const CTA_HEIGHT = 52;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: { ...typography.title, color: colors.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm3 },
  sectionTitle: {
    ...typography.sectionLabel,
    color: colors.textSecondary,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm3,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  listContainer: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  emptyContainer: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  emptyTitle: { ...typography.heading, color: colors.textPrimary },
  errorTitle: { ...typography.heading, color: colors.danger },
  caption: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  footer: { paddingVertical: spacing.md },
  ctas: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  primaryCta: {
    flexDirection: 'row',
    height: CTA_HEIGHT,
    borderRadius: radii.control,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryCtaText: { ...typography.actionMedium, color: colors.textOnAccent },
  button: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  buttonText: { ...typography.bodyStrong, color: colors.textOnAccent },
});
