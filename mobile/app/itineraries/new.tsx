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
 * Dates are plain text rather than a picker. Deliberate, and the weakest part of this screen: a
 * picker is a native-dependency decision (community picker vs platform modal) that the walking
 * skeleton has no business making, and the field is optional anyway. Recorded as a real gap — the
 * first traveler to type "next June" will be told it is not a date, which is a poor answer.
 */
export default function NewItineraryScreen() {
  const router = useRouter();
  const create = useCreateItinerary();

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>();

  function submit() {
    const problem = validateItineraryForm({ title, destination, startDate, endDate });
    setValidationError(problem);
    if (problem !== undefined) return;

    create.mutate(
      {
        title: title.trim(),
        destinations: [destination.trim()],
        ...(startDate.trim() !== '' ? { startDate: startDate.trim() } : {}),
        ...(endDate.trim() !== '' ? { endDate: endDate.trim() } : {}),
      },
      {
        // back(), not replace('/'): the list is where this screen was opened from, and the mutation
        // has already invalidated it — so it refetches and the new trip is there.
        onSuccess: () => router.back(),
      },
    );
  }

  const serverMessage = create.error instanceof ApiError ? create.error.message : undefined;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Plan a trip' }} />

      <Field label="What is this trip?" value={title} onChangeText={setTitle} placeholder="Hokkaido in winter" />
      <Field label="Where to?" value={destination} onChangeText={setDestination} placeholder="Sapporo" />

      <Text style={styles.sectionNote}>
        Dates are optional — a trip can be a someday plan.
      </Text>
      <Field label="Start (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2027-01-10" />
      <Field label="End (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} placeholder="2027-01-20" />

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
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="sentences"
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
