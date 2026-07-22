import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../api/ApiError';
import { useAcceptInvitation, useDeclineInvitation, useInbox } from '../query/invitationQueries';
import { colors, radii, spacing, typography } from '../theme';
import type { InboxInvitationResponse } from '../types/api';

/**
 * The invitation inbox (S1.2, ticket 06) — pinned atop My Trips, the screen every traveler lands on.
 *
 * Pull-based, like everything in alpha (no notifications, founder ruling), so it has to live where it
 * will be seen. An empty inbox renders nothing — no header, no empty-state — so it is invisible until
 * there is something to act on. Accept navigates into the joined trip (the walls-open moment); a
 * 403 EMAIL_NOT_VERIFIED routes to the verify-waiting screen (ticket 08).
 */
export function InvitationInbox() {
  const { data, isPending, isError } = useInbox();
  const invitations = data?.items ?? [];

  // Quietly absent until there is something to show — the inbox never announces its own emptiness,
  // and a transient load/error on a secondary surface must not disrupt My Trips.
  if (isPending || isError || invitations.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Invitations</Text>
      {invitations.map((invitation) => (
        <InvitationCard key={invitation.id} invitation={invitation} />
      ))}
    </View>
  );
}

function InvitationCard({ invitation }: { invitation: InboxInvitationResponse }) {
  const router = useRouter();
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();
  const busy = accept.isPending || decline.isPending;

  const onAccept = () => {
    accept.mutate(invitation.id, {
      onSuccess: (result) => router.push(`/itineraries/${result.itineraryId}`),
      onError: (error) => {
        // The one error worth a screen: verify your email, then retry. Everything else stays inline.
        if (error instanceof ApiError && error.code === 'EMAIL_NOT_VERIFIED') {
          router.push('/verify-email');
        }
      },
    });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardText}>
        <Text style={styles.inviter}>{invitation.inviterName}</Text> invited you to{' '}
        <Text style={styles.trip}>{invitation.tripTitle}</Text>
      </Text>
      <View style={styles.actions}>
        <Pressable
          style={[styles.accept, busy && styles.disabled]}
          onPress={onAccept}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Accept invitation to ${invitation.tripTitle}`}
        >
          {accept.isPending ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.acceptText}>Accept</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.decline, busy && styles.disabled]}
          onPress={() => decline.mutate(invitation.id)}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Decline invitation to ${invitation.tripTitle}`}
        >
          <Text style={styles.declineText}>Decline</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, paddingBottom: spacing.sm },
  heading: { ...typography.caption, color: colors.textSecondary, textTransform: 'uppercase' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardText: { ...typography.body, color: colors.textPrimary },
  inviter: { ...typography.bodyStrong, color: colors.textPrimary },
  trip: { ...typography.bodyStrong, color: colors.textPrimary },
  actions: { flexDirection: 'row', gap: spacing.sm },
  accept: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  acceptText: { ...typography.bodyStrong, color: colors.textOnAccent },
  decline: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  declineText: { ...typography.bodyStrong, color: colors.textSecondary },
  disabled: { opacity: 0.5 },
});
