import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { ApiError } from '../../../../../src/api/ApiError';
import { archivedPlanNotice, publishedPlanNotice } from '../../../../../src/components/editLockedMessage';
import { usePhotoAction } from '../../../../../src/media/usePhotoAction';
import { ScreenHeader } from '../../../../../src/components/ScreenHeader';
import { useEditLock } from '../../../../../src/hooks/useEditLock';
import { isEditable, isPublished } from '../../../../../src/itineraries/publishControls';
import { TripForm } from '../../../../../src/itineraries/TripForm';
import {
  EMPTY_TRIP_FORM,
  tripFormValuesFrom,
  updateRequestFrom,
  validateTripForm,
  type TripFormValues,
} from '../../../../../src/itineraries/tripFormContract';
import {
  useItinerary,
  useRemoveCover,
  useUpdateItinerary,
  useUploadCover,
} from '../../../../../src/query/itineraryQueries';
import { colors, spacing, typography } from '../../../../../src/theme';


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

  const [values, setValues] = useState<TripFormValues>(EMPTY_TRIP_FORM);
  const [validationError, setValidationError] = useState<string | undefined>();

  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current || isPlaceholderData || data === undefined) return;
    hydrated.current = true;
    setValues(tripFormValuesFrom(data));
  }, [data, isPlaceholderData]);

  const coverAction = usePhotoAction();

  function submit() {
    const problem = validateTripForm('edit', values);
    setValidationError(problem);
    if (problem !== undefined) return;

    update.mutate(updateRequestFrom(values), {
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
    <TripForm
      mode="edit"
      values={values}
      onChange={setValues}
      cover={{
        url: data?.coverImageUrl ?? null,
        busy: uploadCover.isPending || removeCover.isPending,
        uploading: uploadCover.isPending,
        onPick: () => void coverAction.pickAndRun((photo) => uploadCover.mutateAsync(photo)),
        onRemove: () => void coverAction.run(() => removeCover.mutateAsync()),
      }}
      onSubmit={submit}
      submitting={update.isPending}
      submitDisabled={editLock.state.kind !== 'held'}
      error={coverAction.failure ?? validationError ?? serverMessage}
      backTo={{ pathname: '/itineraries/[id]', params: { id } }}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.background, flexGrow: 1 },
  archivedTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  archivedBody: { ...typography.caption, color: colors.textSecondary },
});
