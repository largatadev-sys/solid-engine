import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../api/ApiError';
import { confirmWith } from './confirmDestructive';
import { declineInvitationWording } from './confirmDestructiveMessage';
import { AnimatedPressable, usePressFeedback } from './usePressFeedback';
import { GoingFacepile } from '../members/GoingFacepile';
import { useLayoutClose } from '../members/layoutClose';
import {
  expiryIsUrgent,
  expiryLabelOf,
  invitationHasExpired,
  inviterLine,
  tripMetaLine,
} from '../members/invitationCard';
import { MediaThumb } from '../media/MediaThumb';
import { VERIFY_CODE_ROUTE } from '../onboarding/onboardingGate';
import { invitationRepository } from '../repositories/invitationRepository';
import { useAcceptInvitation, useDeclineInvitation, useInbox } from '../query/invitationQueries';
import {
  travelerColors,
  travelerMetrics,
  travelerRadii,
  travelerTypography,
} from '../theme/workspaceTokens';
import type { InboxInvitationResponse } from '../types/api';

import { ACCEPT_LABEL, DECLINE_LABEL } from '../members/travelerCopy';


export function InvitationInbox() {
  const { data, isPending, isError } = useInbox();
  const now = Date.now();
  const invitations = (data?.items ?? []).filter(
    (invitation) => !invitationHasExpired(invitation.expiresAt, now),
  );

  if (isPending || isError || invitations.length === 0) return null;

  return (
    <View style={styles.container}>
      {invitations.map((invitation) => (
        <InvitationCard key={invitation.id} invitation={invitation} now={now} />
      ))}
    </View>
  );
}


function InvitationCard({
  invitation,
  now,
}: {
  invitation: InboxInvitationResponse;
  now: number;
}) {
  const router = useRouter();
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();
  const closeLayout = useLayoutClose();
  const acceptPress = usePressFeedback();
  const declinePress = usePressFeedback();
  const busy = accept.isPending || decline.isPending;

  const meta = tripMetaLine(invitation.destination, invitation.startDate, invitation.endDate);
  const expiry = expiryLabelOf(invitation.expiresAt, now);
  const urgent = expiryIsUrgent(invitation.expiresAt, now);

  const onAccept = () => {
    accept.mutate(invitation.id, {
      onSuccess: (result) => {
        closeLayout();
        router.push(`/itineraries/${result.itineraryId}`);
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'EMAIL_NOT_VERIFIED') {
          router.push(VERIFY_CODE_ROUTE);
        }
      },
    });
  };

  const onDecline = () => {
    const inviter =
      invitation.inviterHandle !== null && invitation.inviterHandle !== ''
        ? `@${invitation.inviterHandle}`
        : invitation.inviterName === ''
          ? 'They'
          : invitation.inviterName;

    confirmWith(declineInvitationWording(inviter), () => {
      closeLayout();
      decline.mutate(invitation.id);
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.cover}>
        {invitation.hasCover ? (
          <MediaThumb
            url={invitationRepository.coverPath(invitation.id)}
            style={{ width: '100%', height: travelerMetrics.inboxCover }}
            accessibilityLabel={`${invitation.tripTitle} cover photo`}
            fallback={<View />}
          />
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={2}>
            {invitation.tripTitle}
          </Text>
          {meta !== null ? (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>

        <View style={styles.goingRow}>
          <GoingFacepile going={invitation.going} />
          <Text style={styles.going} numberOfLines={1}>
            {inviterLine(
              invitation.inviterHandle,
              invitation.inviterName,
              invitation.createdAt,
              now,
            )}
          </Text>
        </View>

        <View style={styles.actions}>
          <AnimatedPressable
            style={[styles.accept, { opacity: acceptPress.opacity }]}
            onPressIn={acceptPress.onPressIn}
            onPressOut={acceptPress.onPressOut}
            onPress={onAccept}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            accessibilityLabel={`${ACCEPT_LABEL} invitation to ${invitation.tripTitle}`}
          >
            {accept.isPending ? (
              <ActivityIndicator size="small" color={travelerColors.onAccent} />
            ) : (
              <Text style={styles.acceptLabel}>{ACCEPT_LABEL}</Text>
            )}
          </AnimatedPressable>

          <AnimatedPressable
            style={[styles.decline, { opacity: declinePress.opacity }]}
            onPressIn={declinePress.onPressIn}
            onPressOut={declinePress.onPressOut}
            onPress={onDecline}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            accessibilityLabel={`${DECLINE_LABEL} invitation to ${invitation.tripTitle}`}
          >
            <Text style={styles.declineLabel}>{DECLINE_LABEL}</Text>
          </AnimatedPressable>

          <View style={styles.spacer} />

          {expiry !== null ? (
            <Text style={[styles.expiry, urgent && styles.expiryUrgent]} numberOfLines={1}>
              {expiry}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    paddingBottom: 12,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: travelerColors.accentBorder,
    borderRadius: travelerRadii.inviteCard,
    overflow: 'hidden',
    backgroundColor: travelerColors.surface,
  },
  cover: {
    height: travelerMetrics.inboxCover,
    backgroundColor: travelerColors.coverWell,
    overflow: 'hidden',
  },
  body: {
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  titleBlock: {
    gap: 2,
  },
  title: {
    ...travelerTypography.cardTitle,
    color: travelerColors.ink,
  },
  meta: {
    ...travelerTypography.cardMeta,
    color: travelerColors.muted,
  },
  goingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  going: {
    flex: 1,
    ...travelerTypography.cardGoing,
    color: travelerColors.muted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
  },
  accept: {
    flexShrink: 0,
    backgroundColor: travelerColors.accent,
    borderRadius: travelerRadii.pill,
    paddingVertical: 8,
    paddingHorizontal: 20,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptLabel: {
    ...travelerTypography.rowAction,
    fontWeight: '700',
    color: travelerColors.onAccent,
  },
  decline: {
    flexShrink: 0,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  declineLabel: {
    ...travelerTypography.rowAction,
    color: travelerColors.muted,
  },
  spacer: {
    flex: 1,
  },
  expiry: {
    flexShrink: 0,
    ...travelerTypography.cardExpiry,
    color: travelerColors.muted,
  },
  expiryUrgent: {
    color: travelerColors.destructive,
  },
});
