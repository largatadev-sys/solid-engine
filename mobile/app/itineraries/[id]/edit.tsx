import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../../src/api/ApiError';
import { DatePicker } from '../../../src/components/DatePicker';
import { archivedPlanNotice } from '../../../src/components/editLockedMessage';
import { GreyedMediaTile } from '../../../src/components/GreyedMediaTile';
import { useEditLock } from '../../../src/hooks/useEditLock';
import {
  addDestination,
  cleanDestinations,
  removeDestination,
  setDestination,
} from '../../../src/itineraries/destinationsEditor';
import { validateItineraryEdit } from '../../../src/itineraries/validateItineraryForm';
import { useItinerary, useUpdateItinerary } from '../../../src/query/itineraryQueries';
import type { UpdateItineraryRequest } from '../../../src/types/api';
import { colors, radii, spacing, typography } from '../../../src/theme';


export default function EditItineraryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPlaceholderData } = useItinerary(id);
  const update = useUpdateItinerary(id);

  const editLock = useEditLock(id);
  const settledArchived = !isPlaceholderData && data !== undefined ? data.archived : undefined;
  useEffect(() => {
    if (settledArchived !== false) return;
    void editLock.acquire({ subjectType: 'header' }).then((granted) => {
      if (!granted) router.back();
    });
  }, [settledArchived]);

  const [title, setTitle] = useState(data?.title ?? '');
  const [destinations, setDestinations] = useState<string[]>(data?.destinations ?? ['']);
  const [description, setDescription] = useState(data?.description ?? '');
  const [startDate, setStartDate] = useState(data?.startDate ?? '');
  const [endDate, setEndDate] = useState(data?.endDate ?? '');
  const [validationError, setValidationError] = useState<string | undefined>();

  function submit() {
    const cleaned = cleanDestinations(destinations);
    const problem = validateItineraryEdit({ title, destinations: cleaned, description, startDate, endDate });
    setValidationError(problem);
    if (problem !== undefined) return;

    const request: UpdateItineraryRequest = {
      title: title.trim(),
      destinations: cleaned,
      ...(description.trim() !== '' ? { description: description.trim() } : {}),
      ...(startDate !== '' ? { startDate } : {}),
      ...(endDate !== '' ? { endDate } : {}),
    };
    update.mutate(request, {
      onSuccess: () => {
        editLock.release();
        router.back();
      },
    });
  }

  const serverMessage = update.error instanceof ApiError ? update.error.message : undefined;

  if (data?.archived === true) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Stack.Screen options={{ title: 'Edit trip' }} />
        <Text style={styles.archivedTitle}>{archivedPlanNotice.title}</Text>
        <Text style={styles.archivedBody}>{archivedPlanNotice.body}</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Edit trip' }} />

      {}
      <GreyedMediaTile surface="coverPhoto" />

      <Field label="Trip title" value={title} onChangeText={setTitle} placeholder="Island Hopping in El Nido" />

      <View style={styles.field}>
        <Text style={styles.label}>Destinations</Text>
        {destinations.map((destination, index) => (
          <View key={index} style={styles.destinationRow}>
            <TextInput
              style={styles.destinationInput}
              value={destination}
              onChangeText={(text) => setDestinations((prev) => setDestination(prev, index, text))}
              accessibilityLabel={`Destination ${index + 1}`}
              placeholder="Palawan"
              placeholderTextColor={colors.textSecondary}
            />
            {destinations.length > 1 && (
              <Pressable
                onPress={() => setDestinations((prev) => removeDestination(prev, index))}
                accessibilityRole="button"
                accessibilityLabel="Remove destination"
                hitSlop={8}
              >
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            )}
          </View>
        ))}
        <Pressable
          onPress={() => setDestinations((prev) => addDestination(prev))}
          accessibilityRole="button"
          style={styles.addDestination}
        >
          <Text style={styles.addDestinationText}>+ Add destination</Text>
        </Pressable>
      </View>

      <Field label="Description" value={description} onChangeText={setDescription} placeholder="What's this trip about?" multiline />

      <DatePicker label="Start date" value={startDate} onChange={setStartDate} />
      <DatePicker label="End date" value={endDate} onChange={setEndDate} />

      {(validationError ?? serverMessage) !== undefined && (
        <Text style={styles.error}>{validationError ?? serverMessage}</Text>
      )}

      <Pressable
        style={[styles.button, (update.isPending || editLock.state.kind !== 'held') && styles.buttonBusy]}
        onPress={submit}
        disabled={update.isPending || editLock.state.kind !== 'held'}
        accessibilityRole="button"
      >
        {update.isPending ? (
          <ActivityIndicator color={colors.textOnAccent} />
        ) : (
          <Text style={styles.buttonText}>Save changes</Text>
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
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={[styles.input, props.multiline === true && styles.inputMultiline]}
        value={props.value}
        onChangeText={props.onChangeText}
        accessibilityLabel={props.label}
        placeholder={props.placeholder}
        placeholderTextColor={colors.textSecondary}
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
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  destinationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  destinationInput: {
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
  remove: { ...typography.caption, color: colors.danger },
  addDestination: { paddingVertical: spacing.xs },
  addDestinationText: { ...typography.caption, color: colors.accent },
  error: { ...typography.caption, color: colors.danger },
  archivedTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  archivedBody: { ...typography.caption, color: colors.textSecondary },
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
