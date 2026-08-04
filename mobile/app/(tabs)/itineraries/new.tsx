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
import { ApiError } from '../../../src/api/ApiError';
import { GreyedMediaTile } from '../../../src/components/GreyedMediaTile';
import { Icon } from '../../../src/components/Icon';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { addRow, cleanRows, removeRow, setRow } from '../../../src/itineraries/rowEditor';
import { validateItineraryForm } from '../../../src/itineraries/validateItineraryForm';
import { useCreateItinerary } from '../../../src/query/itineraryQueries';
import { colors, radii, spacing, typography } from '../../../src/theme';


export default function NewItineraryScreen() {
  const router = useRouter();
  const create = useCreateItinerary();

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState('');
  const [bestTimeOfYear, setBestTimeOfYear] = useState('');
  const [description, setDescription] = useState('');
  const [standouts, setStandouts] = useState<string[]>(['']);
  const [validationError, setValidationError] = useState<string | undefined>();

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
        onSuccess: (created) =>
          router.replace({ pathname: '/itineraries/[id]/days', params: { id: created.id, day: '1' } }),
      },
    );
  }

  const serverMessage = create.error instanceof ApiError ? create.error.message : undefined;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Create Itinerary" size="display" back />

        <GreyedMediaTile surface="coverPhoto" />

        <Field label="Trip Title" value={title} onChangeText={setTitle} placeholder="Island Hopping in El Nido" />

        <View style={styles.row}>
          <View style={styles.rowWide}>
            <Field
              label="Destination"
              value={destination}
              onChangeText={setDestination}
              placeholder="Palawan"
            />
          </View>
          <View style={styles.rowNarrow}>
            <Field
              label="Duration"
              value={duration}
              onChangeText={setDuration}
              placeholder="5"
              keyboardType="number-pad"
            />
          </View>
        </View>

        <Field
          label="Best Time of Year"
          value={bestTimeOfYear}
          onChangeText={setBestTimeOfYear}
          placeholder="Dec - Apr"
        />

        <Field
          label="Trip Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Discover the breathtaking beauty of El Nido's lagoons."
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
                placeholder="Big Lagoon Kayaking"
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
            <Text style={styles.ctaText}>Continue to Daily Schedules</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md, flexGrow: 1 },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowWide: { flex: 1 },
  rowNarrow: { width: 110 },
  field: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textSecondary },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.textPrimary,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  standoutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  standoutInput: {
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.textPrimary,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addStandout: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xs },
  addStandoutText: { ...typography.bodyStrong, color: colors.textPrimary },
  error: { ...typography.caption, color: colors.danger },
  dock: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  cta: {
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
    backgroundColor: colors.textPrimary,
  },
  ctaBusy: { opacity: 0.7 },
  ctaText: { ...typography.bodyStrong, color: colors.textOnAccent },
});
