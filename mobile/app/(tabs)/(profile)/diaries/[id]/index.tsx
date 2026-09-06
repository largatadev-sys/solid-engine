import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { DiaryActionsSheet } from '../../../../../src/diary/DiaryActionsSheet';
import { DiaryDetailScreen } from '../../../../../src/diary/DiaryDetailScreen';
import { askMemoryConfirmation } from '../../../../../src/diary/MemoryConfirm';
import { showMemoryToast } from '../../../../../src/diary/MemoryToast';
import {
  CANCEL_ACTION,
  DELETE_ACTION,
  DELETE_DIARY_ACTION,
  DELETE_FAILED_TOAST,
  DIARY_DELETED_TOAST,
  EDIT_DIARY_ACTION,
  deleteDiaryBody,
  deleteDiaryTitle,
} from '../../../../../src/diary/memoryCopy';
import { useMe } from '../../../../../src/hooks/useMe';
import { memoryRepository } from '../../../../../src/repositories/memoryRepository';
import { useDiary, useMemoryRefresh } from '../../../../../src/query/memoryQueries';
import { PROFILE_TAB_ROUTE } from '../../../../../src/navigation/authRoutes';
import { publicProfileRoute } from '../../../../../src/profile/travelerRoutes';
import { colors } from '../../../../../src/theme';


export default function DiaryDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const diary = useDiary(id ?? null);
  const refresh = useMemoryRefresh();
  const { state } = useMe();
  const [menuOpen, setMenuOpen] = useState(false);

  if (diary.data === undefined) {
    return <ActivityIndicator color={colors.accent} />;
  }

  const me = state.kind === 'ok' ? state.me : null;
  const owned = me !== null && me.id === diary.data.authorId;
  const author = diary.data.author;
  const handle = me?.handle ?? null;

  function askToDelete(): void {
    const subject = diary.data;
    if (subject === undefined) return;

    setMenuOpen(false);
    askMemoryConfirmation(
      {
        title: deleteDiaryTitle(subject.postcardCount),
        body: deleteDiaryBody(subject.title),
        confirmLabel: DELETE_ACTION,
        cancelLabel: CANCEL_ACTION,
      },
      () => {
        router.replace(PROFILE_TAB_ROUTE);
        void memoryRepository
          .deleteDiary(subject.id)
          .then(() => {
            refresh(handle);
            showMemoryToast(DIARY_DELETED_TOAST);
          })
          .catch(() => {
            refresh(handle);
            showMemoryToast(DELETE_FAILED_TOAST, 'failure');
          });
      },
    );
  }

  return (
    <>
      <DiaryDetailScreen
        diary={diary.data}
        authorName={author?.displayName ?? ''}
        authorHandle={author?.handle ?? ''}
        authorAvatarUrl={author?.avatarUrl ?? null}
        owned={owned}
        onOpenAuthor={() => {
          if (owned) router.push(PROFILE_TAB_ROUTE);
          else if (author?.handle) router.push(publicProfileRoute(author.handle));
        }}
        onOpenPostcard={(postcardId) =>
          router.push({ pathname: '/postcards/[id]', params: { id: postcardId } })
        }
        onAddPostcard={(dayId) =>
          router.push({
            pathname: '/diaries/[id]/days/[dayId]/postcard',
            params: { id: diary.data.id, dayId },
          })
        }
        onAddDay={() =>
          router.push({ pathname: '/diaries/[id]/add-day', params: { id: diary.data.id } })
        }
        onDiaryMenu={() => setMenuOpen(true)}
      />

      <DiaryActionsSheet
        open={menuOpen}
        contextLabel={diary.data.title}
        actions={[
          {
            label: EDIT_DIARY_ACTION,
            icon: 'pencil',
            onPress: () => {
              setMenuOpen(false);
              router.push({ pathname: '/diaries/[id]/edit', params: { id: diary.data.id } });
            },
          },
          { label: DELETE_DIARY_ACTION, icon: 'trash', destructive: true, onPress: askToDelete },
        ]}
        onDismiss={() => setMenuOpen(false)}
      />
    </>
  );
}
