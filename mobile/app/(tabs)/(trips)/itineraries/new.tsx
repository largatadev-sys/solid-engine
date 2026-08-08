import { useRouter } from 'expo-router';
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
import { ApiError } from '../../../../src/api/ApiError';
import { CoverPicker } from '../../../../src/media/CoverPicker';
import { notify } from '../../../../src/components/notify';
import { COVER_NOT_ATTACHED } from '../../../../src/media/photoMessages';
import { pickPhoto } from '../../../../src/media/pickPhoto';
import type { PickedPhoto } from '../../../../src/media/pickedPhoto';
import { itineraryRepository } from '../../../../src/repositories/itineraryRepository';
import { Icon } from '../../../../src/components/Icon';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { addRow, cleanRows, removeRow, setRow } from '../../../../src/itineraries/rowEditor';
import { validateItineraryForm } from '../../../../src/itineraries/validateItineraryForm';
import { useCreateItinerary } from '../../../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../../../src/theme';


export default function NewItineraryScreen() {
  const router = useRouter();
  const create = useCreateItinerary();

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState('');
  const [bestTimeOfYear, setBestTimeOfYear] = useState('');
  const [description, setDescription] = useState('');
  const [standouts, setStandouts] = useState<string[]>(['']);
  const [chosenCover, setChosenCover] = useState<PickedPhoto | null>(null);
  const [validationError, setValidationError] = useState<string | undefined>();


  const chooseCover = async () => {
    const picked = await pickPhoto();
    if (picked !== null) setChosenCover(picked);
  };

  function submit() {
    const problem = validateItineraryForm({ title, destination, description, duration });
    setValidationError(problem);
    if (problem !== undefined) return;

    const chosenStandouts = cleanRows(standouts);

    create.mutate(
      {
        title: title.trim(),
        destinations: [destination.trim()],
        ...(description.trim() !== '' ? { description: description.trim() } : {}),
        ...(duration.trim() !== '' ? { durationDays: Number(duration.trim()) } : {}),
        ...(bestTimeOfYear.trim() !== '' ? { bestTimeOfYear: bestTimeOfYear.trim() } : {}),
        ...(chosenStandouts.length > 0 ? { standouts: chosenStandouts } : {}),
      },
      {
        onSuccess: async (created) => {
          await attachChosenCover(created.id);
          router.replace({ pathname: '/itineraries/[id]/days', params: { id: created.id, day: '1' } });
        },
      },
    );
  }


  async function attachChosenCover(itineraryId: string) {
    if (chosenCover === null) return;
    try {
      await itineraryRepository.acquireEditLock(itineraryId, { subjectType: 'header' });
      await itineraryRepository.uploadCover(itineraryId, chosenCover);
      await itineraryRepository.releaseEditLock(itineraryId, { subjectType: 'header' });
    } catch {
      keepTheTripAndSayTheCoverDidNotAttach();
    }
  }


  function keepTheTripAndSayTheCoverDidNotAttach() {
    notify(COVER_NOT_ATTACHED.title, COVER_NOT_ATTACHED.body);
  }

  const serverMessage = create.error instanceof ApiError ? create.error.message : undefined;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Plan a Trip" size="title" back />

        <CoverPicker
          coverUrl={chosenCover?.uri ?? null}
          busy={create.isPending}
          onPick={() => void chooseCover()}
          onRemove={() => setChosenCover(null)}
        />

        <Field label="Trip Title" value={title} onChangeText={setTitle} placeholder="Name your trip" />

        <View style={styles.row}>
          <View style={styles.rowWide}>
            <Field
              label="Destination"
              value={destination}
              onChangeText={setDestination}
              placeholder="Where to?"
            />
          </View>
          <View style={styles.rowNarrow}>
            <Field
              label="Duration"
              value={duration}
              onChangeText={setDuration}
              placeholder="Days"
              keyboardType="number-pad"
            />
          </View>
        </View>

        <Field
          label="Best Time of Year"
          value={bestTimeOfYear}
          onChangeText={setBestTimeOfYear}
          placeholder="Best months to go"
        />

        <Field
          label="Trip Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What's this trip about?"
          multiline
        />

        <View style={styles.field}>
          <Text style={styles.label}>Standouts</Text>
          {standouts.map((standout, index) => (
            <View key={index} style={styles.standoutRow}>
              <TextInput
                style={styles.standoutInput}
                value={standout}
                onChangeText={(text) => setStandouts((prev) => setRow(prev, index, text))}
                accessibilityLabel={`Standout ${index + 1}`}
                placeholder="Add a standout"
                placeholderTextColor={colors.textSecondary}
              />
              <Pressable
                onPress={() => setStandouts((prev) => removeRow(prev, index))}
                accessibilityRole="button"
                accessibilityLabel={`Remove standout ${index + 1}`}
                hitSlop={8}>
                <Icon name="minus" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}
          <Pressable
            style={styles.addStandout}
            onPress={() => setStandouts(addRow)}
            accessibilityRole="button"
            accessibilityLabel="Add Standout">
            <Icon name="plus" size={20} color={colors.textPrimary} />
            <Text style={styles.addStandoutText}>Add Standout</Text>
          </Pressable>
        </View>

        {(validationError ?? serverMessage) !== undefined && (
          <Text style={styles.error}>{validationError ?? serverMessage}</Text>
        )}
      </ScrollView>

      <View style={styles.dock}>
        <Pressable
          style={[styles.cta, create.isPending && styles.ctaBusy]}
          onPress={submit}
          disabled={create.isPending}
          accessibilityRole="button">
          {create.isPending ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.ctaText}>Create Trip</Text>
          )}
        </Pressable>
      </View>
    </View>
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
        accessibilityLabel={props.label}
        placeholder={props.placeholder}
        placeholderTextColor={colors.textSecondary}
        autoCapitalize={props.keyboardType === 'number-pad' ? 'none' : 'sentences'}
        keyboardType={props.keyboardType ?? 'default'}
        multiline={props.multiline ?? false}
      />
    </View>
  );
}

const FORM_GAP = 20;

const CTA_HEIGHT = 46;

const MULTILINE_HEIGHT = 108;

const DURATION_WIDTH = 120;

const inputSurface = {
  backgroundColor: colors.surfaceMuted,
  borderWidth: 1,
  borderColor: colors.inputBorder,
  borderRadius: radii.xs,
  paddingHorizontal: spacing.sm + spacing.xs,
  paddingVertical: spacing.sm + spacing.xs,
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: FORM_GAP,
    flexGrow: 1,
  },
  row: { flexDirection: 'row', gap: spacing.sm + spacing.xs },
  rowWide: { flex: 1 },
  rowNarrow: { width: DURATION_WIDTH },
  field: { gap: spacing.xs + 2 },
  label: { ...typography.fieldLabel, color: colors.textSecondary },
  input: { ...inputSurface, ...typography.input, color: colors.textPrimary },
  inputMultiline: { height: MULTILINE_HEIGHT, textAlignVertical: 'top' },
  standoutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  standoutInput: { ...inputSurface, ...typography.input, flex: 1, color: colors.textPrimary },
  addStandout: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, paddingTop: spacing.xs },
  addStandoutText: { ...typography.fieldAction, color: colors.textPrimary },
  error: { ...typography.caption, color: colors.danger },
  dock: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  cta: {
    height: CTA_HEIGHT,
    borderRadius: radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  ctaBusy: { opacity: 0.7 },
  ctaText: { ...typography.ctaLabel, color: colors.textOnAccent },
});
