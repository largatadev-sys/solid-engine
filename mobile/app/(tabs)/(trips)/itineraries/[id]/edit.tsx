import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../../../../src/api/ApiError';
import { DatePicker } from '../../../../../src/components/DatePicker';
import { archivedPlanNotice, publishedPlanNotice } from '../../../../../src/components/editLockedMessage';
import { CoverPicker } from '../../../../../src/media/CoverPicker';
import { pickPhoto } from '../../../../../src/media/pickPhoto';
import { messageForPhotoFailure } from '../../../../../src/media/photoMessages';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { useEditLock } from '../../../../../src/hooks/useEditLock';
import { addRow, cleanRows, moveRow, removeRow, setRow } from '../../../../../src/itineraries/rowEditor';
import { isEditable, isPublished } from '../../../../../src/itineraries/publishControls';
import { validateItineraryEdit } from '../../../../../src/itineraries/validateItineraryForm';
import {
  useItinerary,
  useRemoveCover,
  useUpdateItinerary,
  useUploadCover,
} from '../../../../../src/query/itineraryQueries';
import type { UpdateItineraryRequest } from '../../../../../src/types/api';
import { colors, radii, spacing, typography } from '../../../../../src/theme';


export default function EditItineraryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPlaceholderData } = useItinerary(id);
  const update = useUpdateItinerary(id);
  const uploadCover = useUploadCover(id);
  const removeCover = useRemoveCover(id);

  const editLock = useEditLock(id);
  const settledEditable = !isPlaceholderData && data !== undefined ? isEditable(data) : undefined;
  useEffect(() => {
    if (settledEditable !== true) return;
    void editLock.acquire({ subjectType: 'header' }).then((granted) => {
      if (!granted) router.back();
    });
  }, [settledEditable]);

  const [title, setTitle] = useState(data?.title ?? '');
  const [destinations, setDestinations] = useState<string[]>(data?.destinations ?? ['']);
  const [description, setDescription] = useState(data?.description ?? '');
  const [standouts, setStandouts] = useState<string[]>(data?.standouts ?? []);
  const [bestTimeOfYear, setBestTimeOfYear] = useState(data?.bestTimeOfYear ?? '');
  const [startDate, setStartDate] = useState(data?.startDate ?? '');
  const [endDate, setEndDate] = useState(data?.endDate ?? '');
  const [validationError, setValidationError] = useState<string | undefined>();

  const chooseCover = async () => {
    setValidationError(undefined);
    const picked = await pickPhoto();
    if (picked === null) return;
    try {
      await uploadCover.mutateAsync(picked);
    } catch (error) {
      setValidationError(messageForPhotoFailure(error));
    }
  };

  const dropCover = async () => {
    setValidationError(undefined);
    try {
      await removeCover.mutateAsync();
    } catch (error) {
      setValidationError(messageForPhotoFailure(error));
    }
  };

  function submit() {
    const cleaned = cleanRows(destinations);
    const problem = validateItineraryEdit({ title, destinations: cleaned, description, startDate, endDate });
    setValidationError(problem);
    if (problem !== undefined) return;

    const request: UpdateItineraryRequest = {
      title: title.trim(),
      destinations: cleaned,
      ...(description.trim() !== '' ? { description: description.trim() } : {}),
      standouts: cleanRows(standouts),
      bestTimeOfYear: bestTimeOfYear.trim(),
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

  const frozen =
    data === undefined ? undefined : data.archived ? archivedPlanNotice : isPublished(data) ? publishedPlanNotice : undefined;
  if (frozen !== undefined) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Edit Trip" back backTo={{ pathname: '/itineraries/[id]', params: { id } }} />
        <Text style={styles.archivedTitle}>{frozen.title}</Text>
        <Text style={styles.archivedBody}>{frozen.body}</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Edit Trip" back backTo={{ pathname: '/itineraries/[id]', params: { id } }} />

      <CoverPicker
        coverUrl={data?.coverImageUrl ?? null}
        busy={uploadCover.isPending || removeCover.isPending}
        onPick={() => void chooseCover()}
        onRemove={() => void dropCover()}
      />

      <Field label="Trip title" value={title} onChangeText={setTitle} placeholder="Island Hopping in El Nido" />

      <View style={styles.field}>
        <Text style={styles.label}>Destinations</Text>
        {destinations.map((destination, index) => (
          <View key={index} style={styles.destinationRow}>
            <TextInput
              style={styles.destinationInput}
              value={destination}
              onChangeText={(text) => setDestinations((prev) => setRow(prev, index, text))}
              accessibilityLabel={`Destination ${index + 1}`}
              placeholder="Palawan"
              placeholderTextColor={colors.textSecondary}
            />
            {destinations.length > 1 && (
              <Pressable
                onPress={() => setDestinations((prev) => removeRow(prev, index))}
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
          onPress={() => setDestinations((prev) => addRow(prev))}
          accessibilityRole="button"
          style={styles.addDestination}
        >
          <Text style={styles.addDestinationText}>+ Add destination</Text>
        </Pressable>
      </View>

      <Field label="Description" value={description} onChangeText={setDescription} placeholder="What's this trip about?" multiline />

      <View style={styles.field}>
        <Text style={styles.label}>Standouts</Text>
        <Text style={styles.hint}>Shown on your published page.</Text>
        {standouts.map((standout, index) => (
          <View key={index} style={styles.destinationRow}>
            <TextInput
              style={styles.destinationInput}
              value={standout}
              onChangeText={(text) => setStandouts((prev) => setRow(prev, index, text))}
              accessibilityLabel={`Standout ${index + 1}`}
              placeholder="Big Lagoon Kayaking"
              placeholderTextColor={colors.textSecondary}
            />
            <Pressable
              onPress={() => setStandouts((prev) => moveRow(prev, index, -1))}
              accessibilityRole="button"
              accessibilityLabel={`Move standout ${index + 1} up`}
              hitSlop={8}
            >
              <Text style={styles.reorder}>↑</Text>
            </Pressable>
            <Pressable
              onPress={() => setStandouts((prev) => moveRow(prev, index, 1))}
              accessibilityRole="button"
              accessibilityLabel={`Move standout ${index + 1} down`}
              hitSlop={8}
            >
              <Text style={styles.reorder}>↓</Text>
            </Pressable>
            <Pressable
              onPress={() => setStandouts((prev) => removeRow(prev, index))}
              accessibilityRole="button"
              accessibilityLabel={`Remove standout ${index + 1}`}
              hitSlop={8}
            >
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={() => setStandouts((prev) => addRow(prev))}
          accessibilityRole="button"
          style={styles.addDestination}
        >
          <Text style={styles.addDestinationText}>+ Add Standout</Text>
        </Pressable>
      </View>

      <Field
        label="Best Time of year"
        value={bestTimeOfYear}
        onChangeText={setBestTimeOfYear}
        placeholder="Dec – Apr"
      />

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
  reorder: { ...typography.bodyStrong, color: colors.accent },
  hint: { ...typography.caption, color: colors.textSecondary },
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
