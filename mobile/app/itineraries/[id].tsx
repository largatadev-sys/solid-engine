import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../src/api/ApiError';
import { formatDates } from '../../src/itineraries/formatDates';
import { useItinerary } from '../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../src/theme';

/**
 * One trip (S0.3).
 *
 * Opened from My Trips, so the list's cache usually already holds this row and it renders with no
 * spinner (see `useItinerary`'s initialData) while refreshing behind the scenes.
 *
 * The 404 case is worth reading: the guard answers identically for "no such itinerary" and "not
 * yours" (Artifact 03's masking rule), so this screen cannot tell them apart either — and says the
 * one true thing it knows.
 */
export default function ItineraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, error } = useItinerary(id);

  if (isPending) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Trip' }} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isError) {
    const missing = error instanceof ApiError && error.code === 'ITINERARY_NOT_FOUND';
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Trip' }} />
        <Text style={styles.errorTitle}>{missing ? 'Trip not found' : 'Could not load this trip'}</Text>
        <Text style={styles.caption}>{error.message}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: data.title }} />

      <Text style={styles.title}>{data.title}</Text>

      <View style={styles.badges}>
        {/* Rendered from the server's values, not assumed: S0.3 only ever produces draft/private,
            but S1.7 and S4.1 make these vary and this screen needs no change to show it. */}
        <Badge label={data.state} />
        <Badge label={data.visibility} />
      </View>

      {/* The workspace's people (S1.2): the roster for everyone, invite/revoke for the owner. */}
      <Link href={`/members/${id}`} asChild>
        <Pressable style={styles.membersLink} accessibilityRole="button">
          <Text style={styles.membersLinkText}>Members</Text>
        </Pressable>
      </Link>

      <Section label="Destinations">
        {data.destinations.map((destination) => (
          <Text key={destination} style={styles.value}>
            {destination}
          </Text>
        ))}
      </Section>

      <Section label="Dates">
        <Text style={styles.value}>{formatDates(data)}</Text>
      </Section>
    </ScrollView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.lg, backgroundColor: colors.background, flexGrow: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: { ...typography.title, color: colors.textPrimary },
  badges: { flexDirection: 'row', gap: spacing.sm },
  membersLink: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.surface,
  },
  membersLinkText: { ...typography.bodyStrong, color: colors.accent },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.surface,
  },
  badgeText: { ...typography.overline, color: colors.textSecondary },
  section: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textSecondary },
  value: { ...typography.body, color: colors.textPrimary },
  errorTitle: { ...typography.heading, color: colors.danger },
  caption: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
});
