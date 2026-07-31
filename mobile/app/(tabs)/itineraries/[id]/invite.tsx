import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { track } from '../../../../src/analytics/track';
import { ApiError } from '../../../../src/api/ApiError';
import { Avatar } from '../../../../src/components/Avatar';
import { comingSoon } from '../../../../src/components/comingSoon';
import { COMING_SOON_SEEN } from '../../../../src/components/comingSoonMessage';
import {
  useInvite,
  useInviteByHandle,
  usePendingInvitations,
  useRevokeInvitation,
} from '../../../../src/query/invitationQueries';
import { HANDLE_MIN_LENGTH, useTravelerByHandle } from '../../../../src/query/travelerQueries';
import { colors, radii, spacing, typography } from '../../../../src/theme';
import type { InvitationResponse } from '../../../../src/types/api';


export default function InviteTravelersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [handleDraft, setHandleDraft] = useState('');
  const [searched, setSearched] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const found = useTravelerByHandle(searched);
  const inviteByHandle = useInviteByHandle(id);
  const inviteByEmail = useInvite(id);
  const pending = usePendingInvitations(id);
  const revoke = useRevokeInvitation(id);
  const pendingList = pending.data?.items ?? [];

  const alreadyInvited = (travelerId: string) =>
    pendingList.some((invitation) => invitation.inviteeTravelerId === travelerId);

  const notFound = found.isError && found.error instanceof ApiError && found.error.code === 'TRAVELER_NOT_FOUND';

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Invite Travelers' }} />

      <View style={styles.section}>
        <Text style={styles.label}>Find by username</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            value={handleDraft}
            onChangeText={setHandleDraft}
            onSubmitEditing={() => setSearched(handleDraft.trim().toLowerCase())}
            accessibilityLabel="Find by username"
            placeholder="janedoe"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={[styles.searchButton, handleDraft.trim().length < HANDLE_MIN_LENGTH && styles.busy]}
            disabled={handleDraft.trim().length < HANDLE_MIN_LENGTH}
            onPress={() => setSearched(handleDraft.trim().toLowerCase())}
            accessibilityRole="button"
            accessibilityLabel="Look up this username"
          >
            <Text style={styles.searchButtonText}>Find</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>Usernames match exactly — ask your friend for theirs.</Text>

        {found.isFetching && <ActivityIndicator color={colors.accent} />}

        {}
        {notFound && <Text style={styles.hint}>Nobody goes by @{searched}.</Text>}

        {found.data !== undefined && (
          <View style={styles.card}>
            <Avatar photoUrl={found.data.avatarUrl} displayName={found.data.displayName} email="" />
            <View style={styles.cardIdentity}>
              <Text style={styles.cardName} numberOfLines={1}>
                {found.data.displayName}
              </Text>
              {found.data.handle !== null && <Text style={styles.cardHandle}>@{found.data.handle}</Text>}
            </View>
            {alreadyInvited(found.data.id) ? (
              <View style={styles.pendingChip}>
                <Text style={styles.pendingChipText}>Pending</Text>
              </View>
            ) : (
              <Pressable
                style={[styles.inviteButton, inviteByHandle.isPending && styles.busy]}
                disabled={inviteByHandle.isPending}
                onPress={() => {
                  setMessage(null);
                  inviteByHandle.mutate(found.data.handle ?? searched, {
                    onSuccess: (invitation) => setMessage(invitedMessage(invitation)),
                    onError: (error) => setMessage(errorMessage(error)),
                  });
                }}
                accessibilityRole="button"
              >
                <Text style={styles.inviteButtonText}>Invite</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      <FromYourNetwork />

      <View style={styles.section}>
        <Text style={styles.label}>Or invite by email</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            accessibilityLabel="Or invite by email"
            placeholder="friend@example.com"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <Pressable
            style={[styles.searchButton, inviteByEmail.isPending && styles.busy]}
            disabled={inviteByEmail.isPending}
            onPress={() => {
              const trimmed = email.trim().toLowerCase();
              if (trimmed === '') return;
              setMessage(null);
              inviteByEmail.mutate(trimmed, {
                onSuccess: (invitation) => {
                  setEmail('');
                  setMessage(invitedMessage(invitation));
                },
                onError: (error) => setMessage(errorMessage(error)),
              });
            }}
            accessibilityRole="button"
          >
            <Text style={styles.searchButtonText}>Send</Text>
          </Pressable>
        </View>
      </View>

      {}
      {message !== null && <Text style={styles.message}>{message}</Text>}

      <View style={styles.section}>
        <Text style={styles.label}>Pending invitations</Text>
        {pending.isPending && <ActivityIndicator color={colors.accent} />}
        {!pending.isPending && pendingList.length === 0 && (
          <Text style={styles.hint}>Nobody is waiting on an invitation right now.</Text>
        )}
        {pendingList.map((invitation) => (
          <View key={invitation.id} style={styles.pendingRow}>
            <Text style={styles.pendingTarget} numberOfLines={1}>
              {inviteeLabel(invitation)}
            </Text>
            <Pressable
              onPress={() => revoke.mutate(invitation.id)}
              disabled={revoke.isPending}
              accessibilityRole="button"
              accessibilityLabel={`Revoke the invitation to ${inviteeLabel(invitation)}`}
              hitSlop={spacing.sm}
            >
              <Text style={styles.revoke}>Revoke</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}


function FromYourNetwork() {
  useEffect(() => {
    track(COMING_SOON_SEEN, { surface: 'network' });
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>From Your Network</Text>
      <Pressable
        style={styles.networkPlaceholder}
        onPress={() => comingSoon('network')}
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        accessibilityLabel="From your network, coming soon"
      >
        <Text style={styles.networkPlaceholderText}>
          Friends you add will appear here. Adding friends is still being built — invite by username or
          email for now.
        </Text>
      </Pressable>
    </View>
  );
}


function inviteeLabel(invitation: InvitationResponse): string {
  if (invitation.inviteeHandle !== null) return `@${invitation.inviteeHandle}`;
  return invitation.email ?? 'a traveler';
}


function invitedMessage(invitation: InvitationResponse): string {
  return `Invitation sent to ${inviteeLabel(invitation)}.`;
}


function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'That invitation could not be sent.';
}


const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.lg, backgroundColor: colors.background, flexGrow: 1 },
  section: { gap: spacing.sm },
  label: { ...typography.caption, color: colors.textSecondary },
  hint: { ...typography.caption, color: colors.textSecondary },
  message: { ...typography.caption, color: colors.textPrimary },
  searchRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  searchButtonText: { ...typography.bodyStrong, color: colors.textOnAccent },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardIdentity: { flex: 1, gap: spacing.xs },
  cardName: { ...typography.bodyStrong, color: colors.textPrimary },
  cardHandle: { ...typography.caption, color: colors.accent },
  inviteButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  inviteButtonText: { ...typography.bodyStrong, color: colors.textOnAccent },
  pendingChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pendingChipText: { ...typography.caption, color: colors.textSecondary },
  networkPlaceholder: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    opacity: 0.7,
  },
  networkPlaceholderText: { ...typography.caption, color: colors.textSecondary },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pendingTarget: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  revoke: { ...typography.caption, color: colors.danger },
  busy: { opacity: 0.7 },
});
