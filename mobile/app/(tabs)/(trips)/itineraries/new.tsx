import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ApiError } from '../../../../src/api/ApiError';
import { notify } from '../../../../src/components/notify';
import { COVER_NOT_ATTACHED } from '../../../../src/media/photoMessages';
import { pickPhoto } from '../../../../src/media/pickPhoto';
import type { PickedPhoto } from '../../../../src/media/pickedPhoto';
import { forgetCoverPreview, rememberCoverPreview } from '../../../../src/media/coverInFlight';
import { itineraryRepository } from '../../../../src/repositories/itineraryRepository';
import { TripForm } from '../../../../src/itineraries/TripForm';
import {
  createRequestFrom,
  EMPTY_TRIP_FORM,
  validateTripForm,
  type TripFormValues,
} from '../../../../src/itineraries/tripFormContract';
import { onItineraryUpdated, useCreateItinerary } from '../../../../src/query/itineraryQueries';


export default function NewItineraryScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const create = useCreateItinerary();

  const [values, setValues] = useState<TripFormValues>(EMPTY_TRIP_FORM);
  const [chosenCover, setChosenCover] = useState<PickedPhoto | null>(null);
  const [validationError, setValidationError] = useState<string | undefined>();


  const chooseCover = async () => {
    const picked = await pickPhoto();
    if (picked !== null) setChosenCover(picked);
  };

  function submit() {
    const problem = validateTripForm('create', values);
    setValidationError(problem);
    if (problem !== undefined) return;

    create.mutate(createRequestFrom(values), {
      onSuccess: (created) => {
        if (chosenCover !== null) rememberCoverPreview(created.id, chosenCover.uri);
        void attachChosenCover(created.id);
        router.replace({ pathname: '/itineraries/[id]/created', params: { id: created.id } });
      },
    });
  }


  async function attachChosenCover(itineraryId: string) {
    if (chosenCover === null) return;
    try {
      await itineraryRepository.acquireEditLock(itineraryId, { subjectType: 'header' });
      const withCover = await itineraryRepository.uploadCover(itineraryId, chosenCover);
      await itineraryRepository.releaseEditLock(itineraryId, { subjectType: 'header' });
      await onItineraryUpdated(client, withCover);
    } catch {
      keepTheTripAndSayTheCoverDidNotAttach();
    } finally {
      forgetCoverPreview(itineraryId);
    }
  }


  function keepTheTripAndSayTheCoverDidNotAttach() {
    notify(COVER_NOT_ATTACHED.title, COVER_NOT_ATTACHED.body);
  }

  const serverMessage = create.error instanceof ApiError ? create.error.message : undefined;

  return (
    <TripForm
      mode="create"
      values={values}
      onChange={setValues}
      cover={{
        url: chosenCover?.uri ?? null,
        busy: create.isPending,
        onPick: () => void chooseCover(),
        onRemove: () => setChosenCover(null),
      }}
      onSubmit={submit}
      submitting={create.isPending}
      error={validationError ?? serverMessage}
    />
  );
}
