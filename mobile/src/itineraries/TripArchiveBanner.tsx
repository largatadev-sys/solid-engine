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


export function TripArchiveBanner({ itinerary }: { itinerary: ItineraryResponse }) {
  const members = useMembers(itinerary.id);
  const { state: meState } = useMe();
  const myId = meState.kind === 'ok' ? meState.me.id : undefined;
  const { isOwner } = memberControls(members.data?.items ?? [], myId);

  const archive = useArchiveTrip(itinerary.id);
  const unarchive = useUnarchiveTrip(itinerary.id);

  const control = archiveControl(itinerary, isOwner);

  if (!itinerary.archived && control === null) {
    return null;
  }

  const archiving = control?.act === 'archive';
  const mutation = archiving ? archive : unarchive;
  const wording = archiving ? archiveTripWording() : unarchiveTripWording();

  const onPress = () => {
    confirmWith(wording, () => mutation.mutate());
  };

  const body = !itinerary.archived
    ? 'Archive it to clear it from your trip list. Nothing is deleted.'
    : control !== null
      ? 'This trip is read-only. Unarchive it to make changes.'
      : 'This trip is read-only. Only the trip owner can unarchive it.';

  return (
    <View style={[styles.banner, itinerary.archived && styles.archived]}>
      <View style={styles.text}>
        <Text style={styles.title}>{itinerary.archived ? 'Archived' : 'Done with this trip?'}</Text>
        <Text style={styles.body}>{body}</Text>
        {mutation.isError && <Text style={styles.error}>{mutation.error.message}</Text>}
      </View>
      {control !== null &&
        (mutation.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Pressable
            style={styles.action}
            accessibilityRole="button"
            disabled={mutation.isPending}
            onPress={onPress}>
            <Text style={styles.actionText}>{archiving ? 'Archive' : 'Unarchive'}</Text>
          </Pressable>
        ))}
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
