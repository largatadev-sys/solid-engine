import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ApiError } from '../../../../../src/api/ApiError';
import { ActivityPhotoStrip } from '../../../../../src/media/ActivityPhotoStrip';
import { usePhotoAction } from '../../../../../src/media/usePhotoAction';
import { Icon } from '../../../../../src/components/Icon';
import { TimePicker } from '../../../../../src/components/TimePicker';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { useEditLock } from '../../../../../src/hooks/useEditLock';
import { useMe } from '../../../../../src/hooks/useMe';
import { validateActivityForm } from '../../../../../src/itineraries/validateActivityForm';
import {
  useAddActivityPhoto,
  useCreateActivity,
  useEditActivity,
  useItinerary,
  useMoveActivity,
  useRemoveActivityPhoto,
} from '../../../../../src/query/itineraryQueries';
import type { ActivityRequest, ActivityResponse, DayResponse } from '../../../../../src/types/api';
import { colors, radii, spacing, typography } from '../../../../../src/theme';


export default function ActivityFormScreen() {
  const router = useRouter();
  const { id, dayId, activityId } = useLocalSearchParams<{ id: string; dayId: string; activityId?: string }>();
  const { data } = useItinerary(id);

  const existing = findActivity(data?.days, dayId, activityId);
  const isEdit = activityId !== undefined;

  const create = useCreateActivity(id);
  const edit = useEditActivity(id);
  const move = useMoveActivity(id);
  const addPhoto = useAddActivityPhoto(id);
  const removePhoto = useRemoveActivityPhoto(id);
  const mutation = isEdit ? edit : create;

  const photoAction = usePhotoAction();

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
  const { state: meState } = useMe();
  const homeCurrency = meState.kind === 'ok' ? (meState.me.preferredCurrency ?? '') : '';
  const [costCurrency, setCostCurrency] = useState(existing?.costCurrency ?? homeCurrency);
  const [place, setPlace] = useState(existing?.place ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [externalUrl, setExternalUrl] = useState(existing?.externalUrl ?? '');
  const [bookingPurpose, setBookingPurpose] = useState(existing?.bookingPurpose ?? '');
  const [bookingProvider, setBookingProvider] = useState(existing?.bookingProvider ?? '');
  const [bookingPriceAmount, setBookingPriceAmount] = useState(existing?.bookingPriceAmount ?? '');
  const bookingCurrency = existing?.bookingPriceCurrency ?? homeCurrency;
  const [validationError, setValidationError] = useState<string | undefined>();
  const [bookingOpen, setBookingOpen] = useState(false);

  const hasBooking = [bookingPurpose, bookingProvider, externalUrl, bookingPriceAmount].some(
    (value) => value.trim() !== '',
  );
  const bookingSummary =
    [bookingProvider.trim(), bookingPurpose.trim()].filter((part) => part !== '').join(' · ') ||
    externalUrl.trim();

  function clearBooking() {
    setBookingPurpose('');
    setBookingProvider('');
    setExternalUrl('');
    setBookingPriceAmount('');
  }

  function submit() {
    const problem = validateActivityForm({
      title,
      timeOfDay,
      costAmount,
      costCurrency,
      bookingPriceAmount,
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
      ...opt('bookingPriceCurrency', bookingPriceAmount.trim() === '' ? '' : bookingCurrency),
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
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <ScreenHeader
        title="Daily Activity"
        back
        backTo={{ pathname: '/itineraries/[id]/days', params: { id } }}
      />

      <Field label="Activity Name" value={title} onChangeText={setTitle} placeholder="Airport Transfer" />

      <View style={styles.row}>
        <View style={styles.rowItem}>
          <TimePicker label="Time" value={timeOfDay} onChange={setTimeOfDay} />
        </View>
        <View style={styles.rowItem}>
          <Field
            label="Estimated Cost"
            value={costAmount}
            onChangeText={setCostAmount}
            placeholder={costCurrency === '' ? 'Amount' : `Amount in ${costCurrency}`}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <Field
        label="Location"
        value={place}
        onChangeText={setPlace}
        placeholder="Describe a specific place or landmark"
      />
      <Field label="Description" value={description} onChangeText={setDescription} placeholder="What happens here?" multiline />
      <Field
        label="Notes & Creator Tips"
        value={notes}
        onChangeText={setNotes}
        placeholder="Book the earliest slot at 8:00 AM to avoid the large tour groups!"
        multiline
      />

      <View style={styles.field}>
        <Text style={styles.label}>Photos</Text>
        {isEdit && activityId !== undefined ? (
          <ActivityPhotoStrip
            photos={existing?.photos ?? []}
            busy={addPhoto.isPending || removePhoto.isPending}
            onAdd={() =>
              void photoAction.pickAndRun((photo) =>
                addPhoto.mutateAsync({ dayId, activityId, photo }),
              )
            }
            onRemove={(photoId) =>
              void photoAction.run(() => removePhoto.mutateAsync({ dayId, activityId, photoId }))
            }
          />
        ) : (
          <Text style={styles.photosHint}>{PHOTOS_AFTER_SAVE_HINT}</Text>
        )}
        {photoAction.failure !== undefined && (
          <Text style={styles.photoError}>{photoAction.failure}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Booking Integration</Text>
        <Pressable
          style={styles.bookingRow}
          accessibilityRole="button"
          onPress={() => setBookingOpen(true)}>
          <View style={styles.bookingRowLabel}>
            <Icon name="link" size={16} color={colors.textPrimary} />
            <Text style={styles.bookingRowText}>
              {hasBooking ? bookingSummary : 'Add Booking Link / Option'}
            </Text>
          </View>
          <Icon name="plus" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <Modal
        visible={bookingOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBookingOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.bookingHeaderRow}>
              <Text style={styles.bookingHeader}>Booking</Text>
              <Pressable
                onPress={clearBooking}
                accessibilityRole="button"
                accessibilityLabel="Clear booking"
                hitSlop={8}>
                <Icon name="trash" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.bookingHint}>
              What you used to book this — it travels with the plan when someone forks it.
            </Text>
            <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
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
              <Field
                label="Estimated Price"
                value={bookingPriceAmount}
                onChangeText={setBookingPriceAmount}
                placeholder={bookingCurrency === '' ? 'Amount' : `Amount in ${bookingCurrency}`}
                keyboardType="decimal-pad"
              />
            </ScrollView>
            <Pressable
              style={styles.dockCta}
              accessibilityRole="button"
              onPress={() => setBookingOpen(false)}>
              <Text style={styles.dockCtaText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {(validationError ?? serverMessage) !== undefined && (
        <Text style={styles.error}>{validationError ?? serverMessage}</Text>
      )}

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

      <View style={styles.dock}>
        <Pressable
          style={[styles.dockCta, mutation.isPending && styles.buttonBusy]}
          onPress={submit}
          disabled={mutation.isPending}
          accessibilityRole="button"
        >
          {mutation.isPending ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.dockCtaText}>Save Activity</Text>
          )}
        </Pressable>
      </View>
    </View>
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

const PHOTOS_AFTER_SAVE_HINT = 'Save this activity first, then add its photos.';

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.background, flexGrow: 1 },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowItem: { flex: 1 },
  rowItemNarrow: { width: 88 },
  field: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textSecondary },
  photosHint: { ...typography.caption, color: colors.textSecondary },
  photoError: { ...typography.caption, color: colors.danger },
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
  screen: { flex: 1, backgroundColor: colors.background },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.textPrimary,
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  bookingRowLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bookingRowText: { ...typography.bodyStrong, color: colors.textPrimary },
  dock: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  dockCta: {
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
    backgroundColor: colors.textPrimary,
  },
  dockCtaText: { ...typography.bodyStrong, color: colors.textOnAccent },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surfaceMuted,
  },
  sheet: {
    width: '100%',
    maxHeight: '85%',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sheetBody: { gap: spacing.md, paddingBottom: spacing.sm },
  bookingHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
