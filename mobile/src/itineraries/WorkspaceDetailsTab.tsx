import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { confirmWith } from '../components/confirmDestructive';
import { unpublishTripWording } from '../components/confirmDestructiveMessage';
import { useUnpublishTrip } from '../query/itineraryQueries';
import { workspaceColors, workspaceRadii, workspaceTypography } from '../theme/workspaceTokens';
import type { ItineraryResponse } from '../types/api';
import { formatDates } from './formatDates';
import { isEditable, publishControl } from './publishControls';


interface WorkspaceDetailsTabProps {
  readonly itinerary: ItineraryResponse;
  readonly isOwner: boolean;
}


export function WorkspaceDetailsTab({ itinerary, isOwner }: WorkspaceDetailsTabProps) {
  const router = useRouter();
  const unpublish = useUnpublishTrip(itinerary.id);
  const control = publishControl(itinerary, isOwner);

  return (
    <View style={styles.body}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>Trip details</Text>
        {isEditable(itinerary) ? (
          <Link href={{ pathname: '/itineraries/[id]/edit', params: { id: itinerary.id } }} asChild>
            <Pressable accessibilityRole="button" accessibilityLabel="Edit trip details" hitSlop={8}>
              <Text style={styles.editLink}>Edit</Text>
            </Pressable>
          </Link>
        ) : null}
      </View>

      <Field label="Destinations">
        {itinerary.destinations.map((destination) => (
          <Text key={destination} style={styles.value}>
            {destination}
          </Text>
        ))}
      </Field>

      <Field label="Dates">
        <Text style={styles.value}>{formatDates(itinerary)}</Text>
      </Field>

      {itinerary.description !== null ? (
        <Field label="Description">
          <Text style={styles.value}>{itinerary.description}</Text>
        </Field>
      ) : null}

      {itinerary.standouts.length > 0 ? (
        <Field label="Standouts">
          {itinerary.standouts.map((standout) => (
            <Text key={standout} style={styles.value}>
              {standout}
            </Text>
          ))}
        </Field>
      ) : null}

      {itinerary.bestTimeOfYear !== null ? (
        <Field label="Best time of year">
          <Text style={styles.value}>{itinerary.bestTimeOfYear}</Text>
        </Field>
      ) : null}

      <Field label="Cover photo">
        <Text style={styles.value}>
          {itinerary.coverImageUrl !== null ? 'Set' : 'No cover photo yet'}
        </Text>
      </Field>

      {itinerary.published ? (
        <Pressable
          style={styles.secondaryAction}
          accessibilityRole="button"
          accessibilityLabel="View published itinerary"
          onPress={() => router.push({ pathname: '/published/[id]', params: { id: itinerary.id } })}
        >
          <Text style={styles.secondaryActionLabel}>View published itinerary</Text>
        </Pressable>
      ) : null}

      {control === 'unpublish' ? (
        <Pressable
          style={styles.secondaryAction}
          accessibilityRole="button"
          accessibilityLabel="Unpublish trip"
          disabled={unpublish.isPending}
          onPress={() => confirmWith(unpublishTripWording(), () => unpublish.mutate())}
        >
          <Text style={styles.secondaryActionLabel}>Unpublish</Text>
        </Pressable>
      ) : null}

    </View>
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}


const styles = StyleSheet.create({
  body: {
    padding: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    ...workspaceTypography.tabLabelActive,
    color: workspaceColors.title,
  },
  editLink: {
    ...workspaceTypography.headerAction,
    color: workspaceColors.accent,
  },
  field: {
    gap: 4,
  },
  fieldLabel: {
    ...workspaceTypography.detailLabel,
    color: workspaceColors.muted,
    textTransform: 'uppercase',
  },
  value: {
    ...workspaceTypography.detailValue,
    color: workspaceColors.title,
  },
  secondaryAction: {
    borderWidth: 1,
    borderColor: workspaceColors.railBorder,
    borderRadius: workspaceRadii.control,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryActionLabel: {
    ...workspaceTypography.ctaSecondary,
    color: workspaceColors.title,
  },
});
