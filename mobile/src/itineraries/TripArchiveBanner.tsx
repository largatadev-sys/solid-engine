import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { archiveTripWording, unarchiveTripWording } from '../components/confirmDestructiveMessage';
import { confirmWith } from '../components/confirmDestructive';
import { useMe } from '../hooks/useMe';
import { useMembers } from '../query/invitationQueries';
import { memberControls } from '../members/memberControls';
import { useArchiveTrip, useUnarchiveTrip } from '../query/itineraryQueries';
import { colors, radii, spacing, typography } from '../theme';
import type { ItineraryResponse } from '../types/api';
import { archiveControl } from './archiveControls';


function useIsOwner(itineraryId: string): boolean {
  const members = useMembers(itineraryId);
  const { state: meState } = useMe();
  const myId = meState.kind === 'ok' ? meState.me.id : undefined;
  return memberControls(members.data?.items ?? [], myId).isOwner;
}


export function TripArchiveBanner({ itinerary }: { itinerary: ItineraryResponse }) {
  const isOwner = useIsOwner(itinerary.id);
  const unarchive = useUnarchiveTrip(itinerary.id);
  const control = archiveControl(itinerary, isOwner);

  if (!itinerary.archived) return null;

  const body =
    control !== null
      ? 'This trip is read-only. Unarchive it to make changes.'
      : 'This trip is read-only. Only the trip owner can unarchive it.';

  return (
    <View style={[styles.banner, styles.archived]}>
      <View style={styles.text}>
        <Text style={styles.title}>Archived</Text>
        <Text style={styles.body}>{body}</Text>
        {unarchive.isError && <Text style={styles.error}>{unarchive.error.message}</Text>}
      </View>
      {control !== null &&
        (unarchive.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Pressable
            style={styles.action}
            accessibilityRole="button"
            disabled={unarchive.isPending}
            onPress={() => confirmWith(unarchiveTripWording(), () => unarchive.mutate())}>
            <Text style={styles.actionText}>Unarchive</Text>
          </Pressable>
        ))}
    </View>
  );
}


export function ArchiveTripLink({ itinerary }: { itinerary: ItineraryResponse }) {
  const isOwner = useIsOwner(itinerary.id);
  const archive = useArchiveTrip(itinerary.id);
  const control = archiveControl(itinerary, isOwner);

  if (itinerary.archived || control === null) return null;

  return (
    <View style={styles.quiet}>
      {archive.isPending ? (
        <ActivityIndicator color={colors.textSecondary} />
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={archive.isPending}
          onPress={() => confirmWith(archiveTripWording(), () => archive.mutate())}>
          <Text style={styles.quietText}>Archive trip</Text>
        </Pressable>
      )}
      {archive.isError && <Text style={styles.error}>{archive.error.message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  archived: { borderColor: colors.accent },
  quiet: { alignItems: 'flex-start', gap: spacing.xs },
  quietText: { ...typography.caption, color: colors.textSecondary, textDecorationLine: 'underline' },
  text: { flexShrink: 1, gap: spacing.xs },
  title: { ...typography.bodyStrong, color: colors.textPrimary },
  body: { ...typography.caption, color: colors.textSecondary },
  error: { ...typography.caption, color: colors.danger },
  action: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  actionText: { ...typography.bodyStrong, color: colors.accent },
});
