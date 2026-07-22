import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../src/api/ApiError';
import { useMe } from '../../src/hooks/useMe';
import {
  useInvite,
  useMembers,
  usePendingInvitations,
  useRevokeInvitation,
} from '../../src/query/invitationQueries';
import { colors, radii, spacing, typography } from '../../src/theme';
import type { InvitationResponse, MemberResponse } from '../../src/types/api';

/**
 * The Members screen (S1.2, ticket 07) — the first screen where a trip's people are named.
 *
 * Every member sees the roster. The owner additionally sees the invite field, the pending
 * invitations, and revoke — gated on the caller's own role, resolved by finding themselves in the
 * member list (the server enforces the same, regardless; the UI just does not advertise dead ends).
 */
export default function MembersScreen() {
  const { itineraryId } = useLocalSearchParams<{ itineraryId: string }>();
  const members = useMembers(itineraryId);
  const { state: meState } = useMe();

  const myId = meState.kind === 'ok' ? meState.me.id : undefined;
  const roster = members.data?.items ?? [];
  const isOwner = myId !== undefined && roster.some((m) => m.travelerId === myId && m.role === 'owner');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: 'Members' }} />

      {members.isPending && <ActivityIndicator color={colors.accent} style={styles.centered} />}
      {members.isError && <Text style={styles.error}>Could not load members.</Text>}

      {!members.isPending && !members.isError && (
        <>
          <Section label="Members">
            {roster.map((member) => (
              <MemberRow key={member.travelerId} member={member} isYou={member.travelerId === myId} />
            ))}
          </Section>

          {isOwner && <OwnerControls itineraryId={itineraryId} />}
        </>
      )}
    </ScrollView>
  );
}

function MemberRow({ member, isYou }: { member: MemberResponse; isYou: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowName} numberOfLines={1}>
        {member.displayName}
        {isYou ? ' (you)' : ''}
      </Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>{member.role}</Text>
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
  rowName: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
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
  disabled: { opacity: 0.5 },
  message: { ...typography.caption, color: colors.textPrimary },
  revoke: { ...typography.caption, color: colors.danger, fontWeight: '600' },
  error: { ...typography.body, color: colors.danger, textAlign: 'center', marginTop: spacing.xl },
});
