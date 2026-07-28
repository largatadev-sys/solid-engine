import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../../src/api/ApiError';
import { missingItineraryMessage } from '../../../src/components/missingItineraryMessage';
import { formatDates } from '../../../src/itineraries/formatDates';
import { formatItineraryState } from '../../../src/itineraries/formatItineraryState';
import { canEditPlan } from '../../../src/itineraries/archiveControls';
import { TripArchiveBanner } from '../../../src/itineraries/TripArchiveBanner';
import { TripLifecycleBanner } from '../../../src/itineraries/TripLifecycleBanner';
import { OwnershipOfferBanner } from '../../../src/members/OwnershipOfferBanner';
import { useItinerary } from '../../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../../src/theme';

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
        <Text style={styles.errorTitle}>
          {missing ? missingItineraryMessage.title : 'Could not load this trip'}
        </Text>
        <Text style={styles.caption}>{missing ? missingItineraryMessage.body : error.message}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: data.title }} />

      <View style={styles.titleRow}>
        <Text style={styles.title}>{data.title}</Text>
        {/* Any member edits the trip's fields (S1.3, ticket 04) — but not on an archived trip, where
            the server refuses every write with TRIP_ARCHIVED. Hidden rather than disabled-and-failing:
            a control that is guaranteed to error is the dead end this repo declines to advertise, and
            the archive banner above explains its absence (S1.9). */}
        {canEditPlan(data) && (
          <Link href={`/itineraries/${id}/edit`} asChild>
            <Pressable accessibilityRole="button" hitSlop={8}>
              <Text style={styles.editLink}>Edit</Text>
            </Pressable>
          </Link>
        )}
      </View>

      <View style={styles.badges}>
        {/* Rendered from the server's values, not assumed: S0.3 only ever produced draft/private,
            S1.7 makes state vary, and S4.1 will make visibility vary with no change here. The state
            label is formatted (unknown values fall through as themselves — ADR-008). */}
        <Badge label={formatItineraryState(data.state)} />
        <Badge label={data.visibility} />
        {/* Archived is a *separate* badge, never a state value: the two machines are orthogonal, so a
            trip can be Completed and Archived at once (S1.9). */}
        {data.archived && <Badge label="archived" />}
      </View>

      {/* The archive notice for everyone on an archived trip, plus the owner's lever (S1.9). Placed
          above the lifecycle banner because it explains the whole screen's state, including why that
          banner is absent. */}
      <TripArchiveBanner itinerary={data} />

      {/* The owner's lifecycle lever, with the date nudge (S1.7). Members see nothing — and nobody sees
          it on an archived trip, whose transitions the server refuses. */}
      {canEditPlan(data) && <TripLifecycleBanner itinerary={data} />}

      {/* Renders only for the traveler being offered the crown (S1.6) — the discovery guarantee the
          offer/accept design rests on, on the one screen a participant actually opens. */}
      <OwnershipOfferBanner itineraryId={id} />


      {/* The workspace's people (S1.2): the roster for everyone, invite/revoke for the owner. */}
      <Link href={`/members/${id}`} asChild>
        <Pressable style={styles.membersLink} accessibilityRole="button">
          <Text style={styles.membersLinkText}>Members</Text>
        </Pressable>
      </Link>

      {/* The plan (S1.3): the day-by-day schedule. Shows the day count so a traveler knows there is
          something to open even before tapping.

          Hidden on an archived trip (S1.9), because that screen is the plan-*editing* hub: it acquires
          the edit lease on mount, which the fence now refuses, so it would bounce straight back with a
          lock message rather than an archive one. Hiding the door is the honest version of a route
          that cannot work — and the day count moves to the section below so an archived plan is still
          readable. */}
      {canEditPlan(data) ? (
        <Link href={`/itineraries/${id}/days`} asChild>
          <Pressable style={styles.membersLink} accessibilityRole="button">
            <Text style={styles.membersLinkText}>
              Daily schedule{data.days.length > 0 ? ` · ${data.days.length} ${data.days.length === 1 ? 'day' : 'days'}` : ''}
            </Text>
          </Pressable>
        </Link>
      ) : (
        data.days.length > 0 && (
          <Section label="Daily schedule">
            <Text style={styles.value}>
              {data.days.length} {data.days.length === 1 ? 'day' : 'days'} planned
            </Text>
          </Section>
        )
      )}

      {data.description !== null && (
        <Section label="Description">
          <Text style={styles.value}>{data.description}</Text>
        </Section>
      )}

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
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { ...typography.title, color: colors.textPrimary, flex: 1 },
  editLink: { ...typography.bodyStrong, color: colors.accent },
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
