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
import { GreyedMediaTile } from '../../src/components/GreyedMediaTile';
import { validateItineraryForm } from '../../src/itineraries/validateItineraryForm';
import { useCreateItinerary } from '../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../src/theme';


export default function NewItineraryScreen() {
  const router = useRouter();
  const create = useCreateItinerary();

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [validationError, setValidationError] = useState<string | undefined>();

  function submit() {
    const problem = validateItineraryForm({ title, destination, description, duration });
    setValidationError(problem);
    if (problem !== undefined) return;

    create.mutate(
      {
        title: title.trim(),
        destinations: [destination.trim()],
        ...(description.trim() !== '' ? { description: description.trim() } : {}),
        ...(duration.trim() !== '' ? { durationDays: Number(duration.trim()) } : {}),
      },
      {
        onSuccess: (created) =>
          router.replace({ pathname: '/itineraries/[id]/days', params: { id: created.id, day: '1' } }),
      },
    );
  }

  const serverMessage = create.error instanceof ApiError ? create.error.message : undefined;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Trip Details' }} />

      <GreyedMediaTile surface="coverPhoto" />

      <Field label="Trip Name" value={title} onChangeText={setTitle} placeholder="Hokkaido in winter" />
      <Field label="Destination" value={destination} onChangeText={setDestination} placeholder="Sapporo, Japan" />
      <Field
        label="Duration (days)"
        value={duration}
        onChangeText={setDuration}
        placeholder="5"
        keyboardType="number-pad"
      />
      <Field
        label="Description (Optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="Island hopping, lagoons, and hidden beaches."
        multiline
      />

      <Text style={styles.sectionNote}>
        Dates are optional and live in the trip&apos;s Details tab — a trip can be a someday plan.
      </Text>

      {}
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
          <Text style={styles.buttonText}>Continue</Text>
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
