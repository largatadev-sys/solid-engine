import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { comingSoon } from '../components/comingSoon';
import { entryEditorRoute } from '../diary/diaryEntryExit';
import { publishedRoute } from '../itineraries/publishedExit';
import { useRemovalCommands } from '../query/removalMutations';
import type { RemovalSubject } from './RemovalSheet';
import {
  ITINERARY_UNPUBLISHED_TOAST,
  OPENING_EDITOR_TOAST,
  OPENING_PUBLISHED_PAGE_TOAST,
  POSTCARD_DELETED_TOAST,
} from './removalCopy';
import { removalActionFor } from './removalDestinations';
import type { RemovalMenuKey } from './removalMenu';
import { useRemovalQueue, type RemovalQueue } from './useRemovalQueue';


export interface ProfileRemoval {
  readonly removal: RemovalQueue;
  readonly choose: (entry: RemovalMenuKey, subject: RemovalSubject) => void;
}


export function useProfileRemoval(announce: (message: string) => void): ProfileRemoval {
  const router = useRouter();
  const commands = useRemovalCommands(announce);

  const removal = useRemovalQueue(
    useCallback(
      (ref) => {
        if (ref.kind === 'deletePostcard' && ref.itineraryId !== null) {
          commands.run(() => commands.deletePostcard(ref.itineraryId!, ref.subjectId));
        }
      },
      [commands],
    ),
    useCallback(
      (ref) => {
        if (ref.kind === 'unpublish') {
          commands.run(() => commands.republish(ref.subjectId));
        }
      },
      [commands],
    ),
  );

  const choose = useCallback(
    (entry: RemovalMenuKey, subject: RemovalSubject) => {
      removal.closeMenu();
      const action = removalActionFor(entry);

      if (action.kind === 'delete') {
        removal.request({
          subjectId: subject.id,
          kind: 'deletePostcard',
          message: POSTCARD_DELETED_TOAST,
          ...(subject.itineraryId === undefined ? {} : { itineraryId: subject.itineraryId }),
        });
        return;
      }

      if (action.kind === 'unpublish') {
        commands.run(() => commands.unpublish(subject.id));
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
          announce(OPENING_EDITOR_TOAST);
          router.push(entryEditorRoute('profile', subject.itineraryId, subject.id));
        }
        return;
      }

      if (action.kind === 'viewPublished') {
        announce(OPENING_PUBLISHED_PAGE_TOAST);
        router.push(publishedRoute('profile', subject.id));
        return;
      }

      if (action.kind === 'editItineraryDetails') {
        announce(OPENING_EDITOR_TOAST);
        router.push({ pathname: '/itineraries/[id]/edit', params: { id: subject.id } });
        return;
      }

      comingSoon(action.surface);
    },
    [announce, commands, removal, router],
  );

  return { removal, choose };
}
