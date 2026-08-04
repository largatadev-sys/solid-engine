import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { GreyedMediaTile } from '../../../../src/components/GreyedMediaTile';
import { TimePicker } from '../../../../src/components/TimePicker';
import { ScreenHeader } from '../../../../src/components/ScreenHeader';
import { useEditLock } from '../../../../src/hooks/useEditLock';
import { validateActivityForm } from '../../../../src/itineraries/validateActivityForm';
import {
  useCreateActivity,
  useEditActivity,
  useItinerary,
  useMoveActivity,
} from '../../../../src/query/itineraryQueries';
import type { ActivityRequest, ActivityResponse, DayResponse } from '../../../../src/types/api';
import { colors, radii, spacing, typography } from '../../../../src/theme';


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

  const editLock = useEditLock(id);
  useEffect(() => {
    if (activityId === undefined) return;
    void editLock.acquire({ subjectType: 'activity', subjectId: activityId }).then((granted) => {
      if (!granted) router.back();
    });
  }, [activityId]);

  const otherDays = (data?.days ?? []).filter((d) => d.id !== dayId);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [timeOfDay, setTimeOfDay] = useState(existing?.timeOfDay ?? '');
  const [costAmount, setCostAmount] = useState(existing?.costAmount ?? '');
  const [costCurrency, setCostCurrency] = useState(existing?.costCurrency ?? '');
  const [place, setPlace] = useState(existing?.place ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [externalUrl, setExternalUrl] = useState(existing?.externalUrl ?? '');
  const [bookingPurpose, setBookingPurpose] = useState(existing?.bookingPurpose ?? '');
  const [bookingProvider, setBookingProvider] = useState(existing?.bookingProvider ?? '');
  const [bookingPriceAmount, setBookingPriceAmount] = useState(existing?.bookingPriceAmount ?? '');
  const [bookingPriceCurrency, setBookingPriceCurrency] = useState(existing?.bookingPriceCurrency ?? '');
  const [validationError, setValidationError] = useState<string | undefined>();

  function submit() {
    const problem = validateActivityForm({
      title,
      timeOfDay,
      costAmount,
      costCurrency,
      bookingPriceAmount,
      bookingPriceCurrency,
    });
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
      ...opt('bookingPurpose', bookingPurpose),
      ...opt('bookingProvider', bookingProvider),
      ...opt('bookingPriceAmount', bookingPriceAmount),
      ...opt('bookingPriceCurrency', bookingPriceCurrency),
    };

    const onDone = {
      onSuccess: () => {
        editLock.release();
        router.back();
      },
    };
    if (isEdit) {
      edit.mutate({ dayId, activityId, request }, onDone);
    } else {
      create.mutate({ dayId, request }, onDone);
    }
  }

  const serverMessage = mutation.error instanceof ApiError ? mutation.error.message : undefined;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <ScreenHeader
        title={isEdit ? 'Edit Activity' : 'Add Activity'}
        back
        backTo={{ pathname: '/itineraries/[id]/days/[dayId]', params: { id, dayId } }}
      />

      <Field label="Activity name" value={title} onChangeText={setTitle} placeholder="Airport Transfer" />

      <TimePicker label="Time" value={timeOfDay} onChange={setTimeOfDay} />

      <View style={styles.row}>
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
      <Field
        label="Notes & Creator Tips"
        hint="Shown on your published page — write it for the traveler following your plan."
        value={notes}
        onChangeText={setNotes}
        placeholder="Book the earliest slot at 8:00 AM to avoid the large tour groups!"
        multiline
      />

      <GreyedMediaTile surface="activityPhoto" />

      <View style={styles.bookingCard}>
        <Text style={styles.bookingHeader}>Booking</Text>
        <Text style={styles.bookingHint}>
          What you used to book this — it travels with the plan when someone forks it.
        </Text>
        <Field
          label="Booking Purpose"
          value={bookingPurpose}
          onChangeText={setBookingPurpose}
          placeholder="River tour, restaurant reservation, etc."
        />
        <Field
          label="Booking Provider"
          value={bookingProvider}
          onChangeText={setBookingProvider}
          placeholder="Klook, Expedia, Booking.com, etc."
        />
        <Field
          label="Target URL"
          value={externalUrl}
          onChangeText={setExternalUrl}
          placeholder="https://klook.com/activity/1243-el-nido-underground"
          keyboardType="url"
        />
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Field
              label="Estimated Price"
              value={bookingPriceAmount}
              onChangeText={setBookingPriceAmount}
              placeholder="1800"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.rowItemNarrow}>
            <Field
              label="Currency"
              value={bookingPriceCurrency}
              onChangeText={setBookingPriceCurrency}
              placeholder="PHP"
            />
          </View>
        </View>
      </View>

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
  hint?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad' | 'url';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      {props.hint !== undefined && <Text style={styles.hint}>{props.hint}</Text>}
      <TextInput
        style={[styles.input, props.multiline === true && styles.inputMultiline]}
        value={props.value}
        onChangeText={props.onChangeText}
        accessibilityLabel={props.label}
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
  hint: { ...typography.caption, color: colors.accent },
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
  bookingCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  bookingHeader: { ...typography.overline, color: colors.textSecondary },
  bookingHint: { ...typography.caption, color: colors.textSecondary },
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
