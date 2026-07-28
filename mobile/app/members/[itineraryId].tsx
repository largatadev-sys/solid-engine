import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../src/api/ApiError';
import { confirmWith } from '../../src/components/confirmDestructive';
import {
  acceptOwnershipWording,
  declineOwnershipWording,
  leaveTripWording,
  offerOwnershipWording,
  removeMemberWording,
  revokeOwnershipOfferWording,
} from '../../src/components/confirmDestructiveMessage';
import { useMe } from '../../src/hooks/useMe';
import { memberControls } from '../../src/members/memberControls';
import {
  useAcceptOwnershipOffer,
  useDeclineOwnershipOffer,
  useEndMembership,
  useInvite,
  useMembers,
  useOfferOwnership,
  usePendingInvitations,
  useRevokeOwnershipOffer,
  useRevokeInvitation,
} from '../../src/query/invitationQueries';
import { useItinerary } from '../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../src/theme';
import type { InvitationResponse, MemberResponse } from '../../src/types/api';

/**
 * The Members screen (S1.2, ticket 07; departure added S1.5) — the first screen where a trip's people
 * are named, and now the only one where they stop being named.
 *
 * Every member sees the roster. The owner additionally sees the invite field, the pending invitations,
 * revoke, and **Remove** on everyone but themselves. A non-owner member sees **Leave trip** instead.
 *
 * <p><strong>The owner has no Leave control at all</strong>, deliberately: INV-4 keeps exactly one owner
 * at all times, so an owner's exit is only coherent after transferring ownership — which is S1.6. The
 * server refuses it either way (409 `OWNER_CANNOT_LEAVE`); the screen simply does not advertise a dead
 * end, the same reason the invite field is owner-only rather than shown-and-rejected.
 */
export default function MembersScreen() {
  const { itineraryId } = useLocalSearchParams<{ itineraryId: string }>();
  const members = useMembers(itineraryId);
  const itinerary = useItinerary(itineraryId);
  const { state: meState } = useMe();
  const endMembership = useEndMembership(itineraryId);
  const offerOwnership = useOfferOwnership(itineraryId);
  const revokeOffer = useRevokeOwnershipOffer(itineraryId);
  const acceptOwnership = useAcceptOwnershipOffer(itineraryId);
  const declineOwnership = useDeclineOwnershipOffer(itineraryId);
  const [departureError, setDepartureError] = useState<string | null>(null);
  const [ownershipError, setOwnershipError] = useState<string | null>(null);

  const myId = meState.kind === 'ok' ? meState.me.id : undefined;
  const roster = members.data?.items ?? [];
  // The gating lives in a pure function so it is testable — a screen is not, under jest-expo (S0.3).
  const {
    isOwner,
    canLeave,
    removableTravelerIds,
    offeredTravelerId,
    offerableTravelerIds,
    canRevokeOffer,
    isOfferedToMe,
  } = memberControls(roster, myId);
  const offeredMember = roster.find((member) => member.travelerId === offeredTravelerId);
  const ownershipBusy =
    offerOwnership.isPending ||
    revokeOffer.isPending ||
    acceptOwnership.isPending ||
    declineOwnership.isPending;

  const removeMember = (member: MemberResponse) => {
    confirmWith(removeMemberWording(member.displayName), () => {
      setDepartureError(null);
      endMembership.mutate(
        { travelerId: member.travelerId, leaving: false },
        { onError: (error) => setDepartureError(departureErrorMessage(error)) },
      );
    });
  };

  const offerTo = (member: MemberResponse) => {
    confirmWith(offerOwnershipWording(member.displayName), () => {
      setOwnershipError(null);
      offerOwnership.mutate(member.travelerId, {
        onError: (error) => setOwnershipError(ownershipErrorMessage(error)),
      });
    });
  };

  const withdrawOffer = () => {
    confirmWith(revokeOwnershipOfferWording(offeredMember?.displayName ?? 'this member'), () => {
      setOwnershipError(null);
      revokeOffer.mutate(undefined, {
        onError: (error) => setOwnershipError(ownershipErrorMessage(error)),
      });
    });
  };

  const acceptTheCrown = () => {
    confirmWith(acceptOwnershipWording(itinerary.data?.title ?? 'this trip'), () => {
      setOwnershipError(null);
      acceptOwnership.mutate(undefined, {
        onError: (error) => setOwnershipError(ownershipErrorMessage(error)),
      });
    });
  };

  const declineTheCrown = () => {
    confirmWith(declineOwnershipWording(), () => {
      setOwnershipError(null);
      declineOwnership.mutate(undefined, {
        onError: (error) => setOwnershipError(ownershipErrorMessage(error)),
      });
    });
  };

  const leaveTrip = () => {
    if (myId === undefined) return;
    confirmWith(leaveTripWording(), () => {
      setDepartureError(null);
      endMembership.mutate(
        { travelerId: myId, leaving: true },
        {
          // Back to My Trips, replacing rather than pushing: the trip we just left must not be
          // reachable with the back gesture — every screen under it would 404 on its next fetch.
          onSuccess: () => router.replace('/'),
          onError: (error) => setDepartureError(departureErrorMessage(error)),
        },
      );
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'Members' }} />

      {members.isPending && <ActivityIndicator color={colors.accent} style={styles.centered} />}
      {members.isError && <Text style={styles.error}>Could not load members.</Text>}

      {!members.isPending && !members.isError && (
        <>
          <Section label="Members">
            {roster.map((member) => (
              <MemberRow
                key={member.travelerId}
                member={member}
                isYou={member.travelerId === myId}
                onRemove={
                  removableTravelerIds.includes(member.travelerId) ? () => removeMember(member) : undefined
                }
                onOffer={
                  offerableTravelerIds.includes(member.travelerId) ? () => offerTo(member) : undefined
                }
                onWithdrawOffer={
                  canRevokeOffer && member.travelerId === offeredTravelerId ? withdrawOffer : undefined
                }
                busy={endMembership.isPending || ownershipBusy}
              />
            ))}
          </Section>

          {departureError !== null && <Text style={styles.error}>{departureError}</Text>}

          {isOfferedToMe && (
            <Section label="Ownership">
              <Text style={styles.message}>
                You&apos;ve been offered ownership of this trip. Accepting makes you responsible for its
                members and settings.
              </Text>
              <Pressable
                style={[styles.button, ownershipBusy && styles.disabled]}
                onPress={acceptTheCrown}
                disabled={ownershipBusy}
                accessibilityRole="button"
              >
                {acceptOwnership.isPending ? (
                  <ActivityIndicator color={colors.textOnAccent} />
                ) : (
                  <Text style={styles.buttonText}>Accept ownership</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.secondaryButton, ownershipBusy && styles.disabled]}
                onPress={declineTheCrown}
                disabled={ownershipBusy}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>Decline</Text>
              </Pressable>
            </Section>
          )}

          {ownershipError !== null && <Text style={styles.error}>{ownershipError}</Text>}

          {isOwner && <OwnerControls itineraryId={itineraryId} />}

          {canLeave && (
            <Section label="Leaving">
              <Pressable
                style={[styles.dangerButton, endMembership.isPending && styles.disabled]}
                onPress={leaveTrip}
                disabled={endMembership.isPending}
                accessibilityRole="button"
              >
                {endMembership.isPending ? (
                  <ActivityIndicator color={colors.danger} />
                ) : (
                  <Text style={styles.dangerButtonText}>Leave trip</Text>
                )}
              </Pressable>
            </Section>
          )}
        </>
      )}
    </ScrollView>
  );
}

function MemberRow({
  member,
  isYou,
  onRemove,
  onOffer,
  onWithdrawOffer,
  busy,
}: {
  member: MemberResponse;
  isYou: boolean;
  /** Present only when the viewer may remove this member — the owner, on somebody else's row. */
  onRemove?: () => void;
  /**
   * Present only when the viewer may offer this member ownership — the owner, on somebody else's row,
   * and only while no offer is pending anywhere on the trip. Its absence on every row is how
   * at-most-one-offer is expressed in the UI.
   */
  onOffer?: () => void;
  /** Present only on the offered member's row, for the owner: retract before it is answered. */
  onWithdrawOffer?: () => void;
  busy: boolean;
}) {
  const offered = member.ownershipOffered === true;
  return (
    <View style={styles.row}>
      <View style={styles.rowIdentity}>
        <Text style={styles.rowName} numberOfLines={1}>
          {member.displayName}
          {isYou ? ' (you)' : ''}
        </Text>
        {offered && <Text style={styles.offeredNote}>Ownership offered</Text>}
      </View>
      <View style={styles.rowActions}>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{member.role}</Text>
        </View>
        {onOffer !== undefined && (
          <Pressable
            onPress={onOffer}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Offer ownership to ${member.displayName}`}
            hitSlop={spacing.sm}
          >
            <Text style={styles.rowAction}>Make owner</Text>
          </Pressable>
        )}
        {onWithdrawOffer !== undefined && (
          <Pressable
            onPress={onWithdrawOffer}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Withdraw the ownership offer to ${member.displayName}`}
            hitSlop={spacing.sm}
          >
            <Text style={styles.rowAction}>Withdraw</Text>
          </Pressable>
        )}
        {onRemove !== undefined && (
          <Pressable
            onPress={onRemove}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${member.displayName}`}
            hitSlop={spacing.sm}
          >
            <Text style={styles.revoke}>Remove</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function OwnerControls({ itineraryId }: { itineraryId: string }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const invite = useInvite(itineraryId);
  const pending = usePendingInvitations(itineraryId);
  const revoke = useRevokeInvitation(itineraryId);
  const pendingList = pending.data?.items ?? [];

  const onInvite = () => {
    const trimmed = email.trim().toLowerCase();
    if (trimmed === '') return;
    setMessage(null);
    invite.mutate(trimmed, {
      onSuccess: () => {
        setEmail('');
        setMessage('Invitation sent.');
      },
      onError: (error) => setMessage(inviteErrorMessage(error)),
    });
  };

  return (
    <>
      <Section label="Invite by email">
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="friend@example.com"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          accessibilityLabel="Email to invite"
        />
        <Pressable
          style={[styles.button, invite.isPending && styles.disabled]}
          onPress={onInvite}
          disabled={invite.isPending}
          accessibilityRole="button"
        >
          {invite.isPending ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.buttonText}>Send invitation</Text>
          )}
        </Pressable>
        {message !== null && <Text style={styles.message}>{message}</Text>}
      </Section>

      {pendingList.length > 0 && (
        <Section label="Pending invitations">
          {pendingList.map((invitation) => (
            <PendingRow
              key={invitation.id}
              invitation={invitation}
              onRevoke={() => revoke.mutate(invitation.id)}
              revoking={revoke.isPending}
            />
          ))}
        </Section>
      )}
    </>
  );
}

function PendingRow({
  invitation,
  onRevoke,
  revoking,
}: {
  invitation: InvitationResponse;
  onRevoke: () => void;
  revoking: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowName} numberOfLines={1}>
        {invitation.email}
      </Text>
      <Pressable onPress={onRevoke} disabled={revoking} accessibilityRole="button" hitSlop={spacing.sm}>
        <Text style={styles.revoke}>Revoke</Text>
      </Pressable>
    </View>
  );
}

/** Branch on the envelope `code`, never the message (Artifact 05). */
function inviteErrorMessage(error: Error): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'ALREADY_A_MEMBER':
        return 'That person is already a member.';
      case 'INVITATION_ALREADY_PENDING':
        return 'That address already has a pending invitation.';
      case 'VALIDATION_FAILED':
        return 'Enter a valid email address.';
      default:
        return error.message;
    }
  }
  return 'Could not send the invitation. Try again.';
}

/**
 * Branch on the envelope `code`, never the message (Artifact 05).
 *
 * `OWNER_CANNOT_LEAVE` should be unreachable from this screen — the owner is never shown a Leave
 * control, and Remove never targets their own row — but it is mapped anyway rather than falling to the
 * generic line. If the gating ever regresses, the traveler gets the sentence that tells them what to do
 * instead of a shrug, and the wrong copy in a screenshot is how the regression gets reported.
 */
function departureErrorMessage(error: Error): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'OWNER_CANNOT_LEAVE':
        return 'Transfer ownership to another member before leaving this trip.';
      case 'NOT_PERMITTED':
        return 'Only the trip owner can remove a member.';
      case 'ITINERARY_NOT_FOUND':
        return 'This trip is no longer available to you.';
      default:
        return error.message;
    }
  }
  return 'Could not complete that. Try again.';
}

/**
 * Branch on the envelope `code`, never the message (Artifact 05) — the ownership-offer surface (S1.6).
 *
 * Most of these should be unreachable from a screen whose controls are gated by `memberControls`, and
 * they are mapped anyway for `departureErrorMessage`'s reason: if the gating regresses, or a second
 * device acted first, the traveler gets a sentence that explains the state rather than a shrug — and
 * the wrong copy in a screenshot is how the regression gets reported. `OFFER_ALREADY_PENDING` and
 * `OFFER_NOT_FOUND` in particular are the two a stale screen produces.
 */
function ownershipErrorMessage(error: Error): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'TARGET_NOT_A_MEMBER':
        return 'That person is not on this trip. Invite them first.';
      case 'CANNOT_OFFER_TO_SELF':
        return 'You already own this trip.';
      case 'OFFER_ALREADY_PENDING':
        return 'An ownership offer is already pending. Withdraw it before offering to somebody else.';
      case 'OFFER_NOT_FOUND':
        return 'That ownership offer is no longer available.';
      case 'NOT_OFFER_TARGET':
        // Distinct from NOT_PERMITTED on purpose: this caller is not missing a role, they are acting on
        // an offer that has since been withdrawn and re-made to somebody else. A sentence about owners
        // would not describe their situation at all.
        return 'That ownership offer is no longer yours — it was withdrawn or offered to someone else.';
      case 'NOT_PERMITTED':
        return 'Only the trip owner can offer ownership.';
      case 'ITINERARY_NOT_FOUND':
        return 'This trip is no longer available to you.';
      default:
        return error.message;
    }
  }
  return 'Could not complete that. Try again.';
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const FIELD_MAX_WIDTH = 420;

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.lg, backgroundColor: colors.background, flexGrow: 1 },
  centered: { marginTop: spacing.xl },
  section: { gap: spacing.sm },
  label: { ...typography.caption, color: colors.textSecondary, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  rowIdentity: { flexShrink: 1, gap: spacing.xs },
  rowName: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  offeredNote: { ...typography.caption, color: colors.accent },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowAction: { ...typography.caption, color: colors.accent, fontWeight: '600' },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accentMuted,
  },
  roleText: { ...typography.overline, color: colors.textSecondary },
  input: {
    maxWidth: FIELD_MAX_WIDTH,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.body,
    color: colors.textPrimary,
  },
  button: {
    maxWidth: FIELD_MAX_WIDTH,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  buttonText: { ...typography.bodyStrong, color: colors.textOnAccent },
  // Outlined rather than filled: leaving is destructive but it is not the screen's primary action, and
  // a solid danger-coloured slab reads as an instruction. The invite CTA keeps the filled treatment.
  dangerButton: {
    maxWidth: FIELD_MAX_WIDTH,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerButtonText: { ...typography.bodyStrong, color: colors.danger },
  // Declining is not destructive — nothing is lost and it can be offered again — so it gets the quiet
  // outlined treatment rather than the danger colour Leave uses.
  secondaryButton: {
    maxWidth: FIELD_MAX_WIDTH,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: { ...typography.bodyStrong, color: colors.textSecondary },
  disabled: { opacity: 0.5 },
  message: { ...typography.caption, color: colors.textPrimary },
  revoke: { ...typography.caption, color: colors.danger, fontWeight: '600' },
  error: { ...typography.body, color: colors.danger, textAlign: 'center', marginTop: spacing.xl },
});
