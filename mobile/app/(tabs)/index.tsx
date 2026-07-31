import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { InvitationInbox } from '../../src/components/InvitationInbox';
import { TripRow } from '../../src/itineraries/TripRow';
import {
  DEFAULT_TRIP_CATEGORY,
  emptyCategoryMessage,
  TRIP_CATEGORIES,
  tripCategoryLabel,
} from '../../src/itineraries/tripCategories';
import { useMyItineraries } from '../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../src/theme';
import type { TripCategory } from '../../src/types/api';


export default function MyTripsScreen() {
  const [category, setCategory] = useState<TripCategory>(DEFAULT_TRIP_CATEGORY);
  const { data, isPending, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMyItineraries(category);

  const itineraries = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipBar}
        contentContainerStyle={styles.chipRow}
      >
        {TRIP_CATEGORIES.map((option) => (
          <CategoryChip
            key={option}
            label={tripCategoryLabel(option)}
            selected={category === option}
            onPress={() => setCategory(option)}
          />
        ))}
      </ScrollView>

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
          ListEmptyComponent={<EmptyState category={category} />}
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
    </View>
  );
}

function CategoryChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}


function EmptyState({ category }: { category: TripCategory }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>
        {`No ${tripCategoryLabel(category).toLowerCase()} trips`}
      </Text>
      <Text style={styles.caption}>{emptyCategoryMessage(category)}</Text>
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
  chipBar: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  chipRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextSelected: { color: colors.textOnAccent, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
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
