import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../../../src/api/ApiError';
import { confirmWith } from '../../../../src/components/confirmDestructive';
import {
  acceptOwnershipWording,
  declineOwnershipWording,
  leaveTripWording,
  offerOwnershipWording,
  removeMemberWording,
  revokeOwnershipOfferWording,
} from '../../../../src/components/confirmDestructiveMessage';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { useMe } from '../../../../src/hooks/useMe';
import { memberControls } from '../../../../src/members/memberControls';
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
} from '../../../../src/query/invitationQueries';
import { useItinerary } from '../../../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../../../src/theme';
import type { InvitationResponse, MemberResponse } from '../../../../src/types/api';


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
  const {
    canInvite,
    canLeave,
    removableTravelerIds,
    offeredTravelerId,
    offerableTravelerIds,
    canRevokeOffer,
    isOfferedToMe,
  } = memberControls(roster, myId, itinerary.data?.archived ?? false);
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
          onSuccess: () => router.replace('/'),
          onError: (error) => setDepartureError(departureErrorMessage(error)),
        },
      );
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader
        title="Members"
        back
        backTo={{ pathname: '/itineraries/[id]', params: { id: itineraryId } }}
      />

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

  onRemove?: () => void;

  onOffer?: () => void;

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
  dangerButton: {
    maxWidth: FIELD_MAX_WIDTH,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerButtonText: { ...typography.bodyStrong, color: colors.danger },
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
