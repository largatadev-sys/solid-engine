import { useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { comingSoon } from '../components/comingSoon';
import { entryEditorRoute } from '../diary/diaryEntryExit';
import { publishedRoute } from '../itineraries/publishedExit';
import { useRemovalCommands } from '../query/removalMutations';
import type { RemovalSubject } from './RemovalSheet';
import { ITINERARY_UNPUBLISHED_TOAST, POSTCARD_DELETED_TOAST } from './removalCopy';
import { removalActionFor } from './removalDestinations';
import type { RemovalMenuKey } from './removalMenu';
import { useRemovalQueue, type RemovalQueue } from './useRemovalQueue';


export interface ProfileRemoval {
  readonly removal: RemovalQueue;
  readonly choose: (entry: RemovalMenuKey, subject: RemovalSubject) => void;
}


export function useProfileRemoval(): ProfileRemoval {
  const router = useRouter();
  const commands = useRemovalCommands();
  const subjects = useRef(new Map<string, RemovalSubject>()).current;

  const removal = useRemovalQueue(
    useCallback(
      (ref) => {
        const subject = subjects.get(ref.subjectId);
        subjects.delete(ref.subjectId);
        if (ref.kind === 'deletePostcard' && subject?.itineraryId !== undefined) {
          void commands.deletePostcard(subject.itineraryId, ref.subjectId);
        }
      },
      [commands, subjects],
    ),
    useCallback(
      (ref) => {
        const subject = subjects.get(ref.subjectId);
        subjects.delete(ref.subjectId);
        if (ref.kind === 'unpublish') {
          void commands.republish(ref.subjectId, subject?.audience ?? 'public');
        }
      },
      [commands, subjects],
    ),
  );

  const choose = useCallback(
    (entry: RemovalMenuKey, subject: RemovalSubject) => {
      removal.closeMenu();
      const action = removalActionFor(entry);

      if (action.kind === 'delete') {
        subjects.set(subject.id, subject);
        removal.request({
          subjectId: subject.id,
          kind: 'deletePostcard',
          message: POSTCARD_DELETED_TOAST,
        });
        return;
      }

      if (action.kind === 'unpublish') {
        subjects.set(subject.id, subject);
        void commands.unpublish(subject.id);
        removal.request({
          subjectId: subject.id,
          kind: 'unpublish',
          message: ITINERARY_UNPUBLISHED_TOAST,
          deferred: false,
        });
        return;
      }

      if (action.kind === 'editPostcard') {
        if (subject.itineraryId !== undefined) {
          router.push(entryEditorRoute('profile', subject.itineraryId, subject.id));
        }
        return;
      }

      if (action.kind === 'viewPublished') {
        router.push(publishedRoute('profile', subject.id));
        return;
      }

      if (action.kind === 'editItineraryDetails') {
        router.push({ pathname: '/itineraries/[id]/edit', params: { id: subject.id } });
        return;
      }

      comingSoon(action.surface);
    },
    [commands, removal, router, subjects],
  );

  return { removal, choose };
}
