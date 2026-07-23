import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ApiError } from '../../src/api/ApiError';
import { DatePicker } from '../../src/components/DatePicker';
import { GreyedMediaTile } from '../../src/components/GreyedMediaTile';
import { validateItineraryForm } from '../../src/itineraries/validateItineraryForm';
import { useCreateItinerary } from '../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../src/theme';

/**
 * Plan a trip — the create screen (S0.3).
 *
 * The form is one destination field submitting a one-element array: the API takes a list (Artifact
 * 02 says "destination(s)", and a singular field could never become plural under ADR-008), while the
 * UI stays honest about what S0.3 asks for. Multi-destination later is a change to this file only.
 *
 * Dates use the real `DatePicker` (S1.3 ticket 04 — the S0.3 hand-typed-date debt, discharged here
 * and on the edit screen): platform-forked, the native community picker on device and the
 * browser-native input on web. The field stays optional (a someday trip has none), so each can clear.
 *
 * S1.3 adds a description and a duration: duration mints that many empty days on the server (ADR-013),
 * and lands the traveler on the Daily Schedules screen to fill them.
 */
export default function NewItineraryScreen() {
  const router = useRouter();
  const create = useCreateItinerary();

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>();

  function submit() {
    const problem = validateItineraryForm({ title, destination, description, startDate, endDate, duration });
    setValidationError(problem);
    if (problem !== undefined) return;

    create.mutate(
      {
        title: title.trim(),
        destinations: [destination.trim()],
        ...(description.trim() !== '' ? { description: description.trim() } : {}),
        ...(startDate.trim() !== '' ? { startDate: startDate.trim() } : {}),
        ...(endDate.trim() !== '' ? { endDate: endDate.trim() } : {}),
        ...(duration.trim() !== '' ? { durationDays: Number(duration.trim()) } : {}),
      },
      {
        // Replace this screen with the new trip's detail, so the back button returns to My Trips (the
        // list has already been invalidated and refetches). Landing on the plan is the point of adding
        // a duration — the empty days are there to fill.
        onSuccess: (created) => router.replace(`/itineraries/${created.id}`),
      },
    );
  }

  const serverMessage = create.error instanceof ApiError ? create.error.message : undefined;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Plan a trip' }} />

      {/* Cover photo — the mock's drop zone; S3.3 (media pipeline) activates it (ticket 05 grey-out). */}
      <GreyedMediaTile label="Cover photo" />

      <Field label="What is this trip?" value={title} onChangeText={setTitle} placeholder="Hokkaido in winter" />
      <Field label="Where to?" value={destination} onChangeText={setDestination} placeholder="Sapporo" />
      <Field
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="Island hopping, lagoons, and hidden beaches."
        multiline
      />
      <Field
        label="How many days? (optional)"
        value={duration}
        onChangeText={setDuration}
        placeholder="5"
        keyboardType="number-pad"
      />

      <Text style={styles.sectionNote}>
        Dates are optional — a trip can be a someday plan.
      </Text>
      <DatePicker label="Start date" value={startDate} onChange={setStartDate} />
      <DatePicker label="End date" value={endDate} onChange={setEndDate} />

      {/* One message at a time: the client's own rules first, then whatever the server said. The
          envelope's `message` is written to be shown (Artifact 05), so it is shown as-is. */}
      {(validationError ?? serverMessage) !== undefined && (
        <Text style={styles.error}>{validationError ?? serverMessage}</Text>
      )}

      <Pressable
        style={[styles.button, create.isPending && styles.buttonBusy]}
        onPress={submit}
        disabled={create.isPending}
        accessibilityRole="button"
      >
        {create.isPending ? (
          <ActivityIndicator color={colors.textOnAccent} />
        ) : (
          <Text style={styles.buttonText}>Create draft</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={[styles.input, props.multiline === true && styles.inputMultiline]}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={colors.textSecondary}
        autoCapitalize={props.keyboardType === 'number-pad' ? 'none' : 'sentences'}
        keyboardType={props.keyboardType ?? 'default'}
        multiline={props.multiline ?? false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.background, flexGrow: 1 },
  field: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textSecondary },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  sectionNote: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  error: { ...typography.caption, color: colors.danger },
  button: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  buttonBusy: { opacity: 0.7 },
  buttonText: { ...typography.bodyStrong, color: colors.textOnAccent },
});
