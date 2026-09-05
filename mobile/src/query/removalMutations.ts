import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { track } from '../analytics/track';
import { DIARY_ENTRY_DELETED } from '../diary/diaryEvents';
import { failureToast } from '../removal/removalFailure';
import { diaryRepository } from '../repositories/diaryRepository';
import { invitationRepository } from '../repositories/invitationRepository';
import { itineraryRepository } from '../repositories/itineraryRepository';
import { feedKeys } from './feedQueries';
import { diaryKeys } from './diaryQueries';
import { itineraryKeys } from './itineraryQueries';
import { profileKeys } from './profileQueries';


export interface RemovalCommands {
  readonly deletePostcard: (itineraryId: string, entryId: string) => Promise<void>;
  readonly unpublish: (itineraryId: string) => Promise<void>;
  readonly republish: (itineraryId: string) => Promise<void>;
  readonly leaveTrip: (itineraryId: string, travelerId: string) => Promise<void>;
  readonly archiveTrip: (itineraryId: string) => Promise<void>;
  readonly run: (command: () => Promise<void>) => void;
}


export function useRemovalCommands(announce: (message: string) => void): RemovalCommands {
  const client = useQueryClient();
  const say = useRef(announce);
  say.current = announce;

  const refreshDiary = useCallback(
    async (itineraryId: string) => {
      await client.invalidateQueries({ queryKey: diaryKeys.mine(itineraryId) });
      await client.invalidateQueries({ queryKey: diaryKeys.trips() });
      await client.invalidateQueries({ queryKey: profileKeys.all });
      await client.invalidateQueries({ queryKey: feedKeys.all });
    },
    [client],
  );

  const refreshItineraries = useCallback(async () => {
    await client.invalidateQueries({ queryKey: profileKeys.all });
    await client.invalidateQueries({ queryKey: itineraryKeys.all });
    await client.invalidateQueries({ queryKey: feedKeys.all });
  }, [client]);

  return {
    deletePostcard: useCallback(
      async (itineraryId: string, entryId: string) => {
        await diaryRepository.remove(itineraryId, entryId);
        track(DIARY_ENTRY_DELETED, { itineraryId, diaryEntryId: entryId });
        await refreshDiary(itineraryId);
      },
      [refreshDiary],
    ),

    unpublish: useCallback(
      async (itineraryId: string) => {
        await itineraryRepository.unpublishTrip(itineraryId);
        await refreshItineraries();
      },
      [refreshItineraries],
    ),

    republish: useCallback(
      async (itineraryId: string) => {
        await itineraryRepository.publishTrip(itineraryId);
        await refreshItineraries();
      },
      [refreshItineraries],
    ),

    leaveTrip: useCallback(
      async (itineraryId: string, travelerId: string) => {
        await invitationRepository.endMembership(itineraryId, travelerId);
        await refreshItineraries();
      },
      [refreshItineraries],
    ),

    archiveTrip: useCallback(
      async (itineraryId: string) => {
        await itineraryRepository.archiveTrip(itineraryId);
        await refreshItineraries();
      },
      [refreshItineraries],
    ),

    run: useCallback((command: () => Promise<void>) => {
      void command().catch((cause: unknown) => {
        const message = failureToast(cause);
        if (message !== null) say.current(message);
      });
    }, []),
  };
}
