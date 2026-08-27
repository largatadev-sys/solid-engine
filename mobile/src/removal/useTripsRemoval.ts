import { useCallback, useRef, useState } from 'react';
import { useMe } from '../hooks/useMe';
import { useRemovalCommands } from '../query/removalMutations';
import type { ItineraryResponse } from '../types/api';
import { LEFT_TRIP_TOAST, TRIP_DELETED_TOAST } from './removalCopy';
import type { SwipeAction } from './SwipeRevealRow';
import { useRemovalQueue, type RemovalQueue } from './useRemovalQueue';


export function swipeActionFor(itinerary: ItineraryResponse): SwipeAction {
  return itinerary.viewerRole === 'member' ? 'leave' : 'delete';
}


export interface TripsRemoval {
  readonly removal: RemovalQueue;
  readonly openCard: string | null;
  readonly setOpenCard: (id: string | null) => void;
  readonly closeCards: () => void;
  readonly leave: (itinerary: ItineraryResponse) => void;
  readonly deleteTrip: (itinerary: ItineraryResponse) => void;
}


export function useTripsRemoval(): TripsRemoval {
  const commands = useRemovalCommands();
  const { state } = useMe();
  const travelerId = state.kind === 'ok' ? state.me.id : null;
  const me = useRef(travelerId);
  me.current = travelerId;

  const [openCard, setOpenCard] = useState<string | null>(null);

  const removal = useRemovalQueue(
    useCallback(
      (ref) => {
        if (ref.kind === 'leaveTrip' && me.current !== null) {
          void commands.leaveTrip(ref.subjectId, me.current);
        }
      },
      [commands],
    ),
  );

  const leave = useCallback(
    (itinerary: ItineraryResponse) => {
      setOpenCard(null);
      removal.request({
        subjectId: itinerary.id,
        kind: 'leaveTrip',
        message: LEFT_TRIP_TOAST,
      });
    },
    [removal],
  );

  const deleteTrip = useCallback(
    (itinerary: ItineraryResponse) => {
      setOpenCard(null);
      void commands.archiveTrip(itinerary.id);
      removal.request({
        subjectId: itinerary.id,
        kind: 'deleteTrip',
        message: TRIP_DELETED_TOAST,
        undoable: false,
      });
    },
    [commands, removal],
  );

  return {
    removal,
    openCard,
    setOpenCard,
    closeCards: useCallback(() => setOpenCard(null), []),
    leave,
    deleteTrip,
  };
}
