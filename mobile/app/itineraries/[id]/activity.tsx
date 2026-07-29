import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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
import { validateActivityForm } from '../../../src/itineraries/validateActivityForm';
import {
  useCreateActivity,
  useEditActivity,
  useItinerary,
  useMoveActivity,
} from '../../../src/query/itineraryQueries';
import type { ActivityRequest, ActivityResponse, DayResponse } from '../../../src/types/api';
import { colors, radii, spacing, typography } from '../../../src/theme';


export default function ActivityFormScreen() {
  const router = useRouter();
  const { id, dayId, activityId } = useLocalSearchParams<{ id: string; dayId: string; activityId?: string }>();
  const { data } = useItinerary(id);

  const existing = findActivity(data?.days, dayId, activityId);
  const isEdit = activityId !== undefined;

  const create = useCreateActivity(id);
  const edit = useEditActivity(id);
  const move = useMoveActivity(id);
  const mutation = isEdit ? edit : create;

  const otherDays = (data?.days ?? []).filter((d) => d.id !== dayId);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [timeOfDay, setTimeOfDay] = useState(existing?.timeOfDay ?? '');
  const [costAmount, setCostAmount] = useState(existing?.costAmount ?? '');
  const [costCurrency, setCostCurrency] = useState(existing?.costCurrency ?? '');
  const [place, setPlace] = useState(existing?.place ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [externalUrl, setExternalUrl] = useState(existing?.externalUrl ?? '');
  const [validationError, setValidationError] = useState<string | undefined>();

  function submit() {
    const problem = validateActivityForm({ title, timeOfDay, costAmount, costCurrency });
    setValidationError(problem);
    if (problem !== undefined) return;

    const request: ActivityRequest = {
      title: title.trim(),
      ...opt('timeOfDay', timeOfDay),
      ...opt('costAmount', costAmount),
      ...opt('costCurrency', costCurrency),
      ...opt('place', place),
      ...opt('description', description),
      ...opt('notes', notes),
      ...opt('externalUrl', externalUrl),
    };

    const onDone = { onSuccess: () => router.back() };
    if (isEdit) {
      edit.mutate({ dayId, activityId, request }, onDone);
    } else {
      create.mutate({ dayId, request }, onDone);
    }
  }

  const serverMessage = mutation.error instanceof ApiError ? mutation.error.message : undefined;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: isEdit ? 'Edit activity' : 'Add activity' }} />

      <Field label="Activity name" value={title} onChangeText={setTitle} placeholder="Airport Transfer" />

      <View style={styles.row}>
        <View style={styles.rowItem}>
          <Field label="Time (24h)" value={timeOfDay} onChangeText={setTimeOfDay} placeholder="14:00" />
        </View>
        <View style={styles.rowItem}>
          <Field
            label="Est. cost"
            value={costAmount}
            onChangeText={setCostAmount}
            placeholder="500"
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.rowItemNarrow}>
          <Field label="Currency" value={costCurrency} onChangeText={setCostCurrency} placeholder="PHP" />
        </View>
      </View>

      <Field label="Location" value={place} onChangeText={setPlace} placeholder="Describe a place or landmark" />
      <Field label="Description" value={description} onChangeText={setDescription} placeholder="What happens here?" multiline />
      <Field label="Notes & tips (private)" value={notes} onChangeText={setNotes} placeholder="Anything for your group" multiline />

      {}
      <GreyedMediaTile label="Add photo" />

      <Field label="Booking link" value={externalUrl} onChangeText={setExternalUrl} placeholder="https://…" keyboardType="url" />

      {(validationError ?? serverMessage) !== undefined && (
        <Text style={styles.error}>{validationError ?? serverMessage}</Text>
      )}

      <Pressable
        style={[styles.button, mutation.isPending && styles.buttonBusy]}
        onPress={submit}
        disabled={mutation.isPending}
        accessibilityRole="button"
      >
        {mutation.isPending ? (
          <ActivityIndicator color={colors.textOnAccent} />
        ) : (
          <Text style={styles.buttonText}>{isEdit ? 'Save activity' : 'Add activity'}</Text>
        )}
      </Pressable>

      {}
      {isEdit && otherDays.length > 0 && (
        <View style={styles.moveSection}>
          <Text style={styles.label}>Move to another day</Text>
          <View style={styles.moveChips}>
            {otherDays.map((day) => (
              <Pressable
                key={day.id}
                style={styles.moveChip}
                disabled={move.isPending}
                onPress={() =>
                  move.mutate({ dayId, activityId, targetDayId: day.id }, { onSuccess: () => router.back() })
                }
                accessibilityRole="button"
              >
                <Text style={styles.moveChipText}>{dayLabel(day)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}


function dayLabel(day: DayResponse): string {
  return day.title !== null && day.title !== '' ? day.title : `Day ${day.ordinal}`;
}


function findActivity(
  days: ItineraryDays | undefined,
  dayId: string,
  activityId: string | undefined,
): ActivityResponse | undefined {
  if (activityId === undefined || days === undefined) return undefined;
  return days.find((d) => d.id === dayId)?.activities.find((a) => a.id === activityId);
}

type ItineraryDays = NonNullable<ReturnType<typeof useItinerary>['data']>['days'];


function opt(key: keyof ActivityRequest, value: string): Partial<ActivityRequest> {
  return value.trim() !== '' ? { [key]: value.trim() } : {};
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad' | 'url';
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
        autoCapitalize={props.keyboardType === 'url' ? 'none' : 'sentences'}
        keyboardType={props.keyboardType ?? 'default'}
        multiline={props.multiline ?? false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.background, flexGrow: 1 },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowItem: { flex: 1 },
  rowItemNarrow: { width: 88 },
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
  moveSection: { gap: spacing.sm, marginTop: spacing.md },
  moveChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  moveChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  moveChipText: { ...typography.caption, color: colors.textPrimary },
});
