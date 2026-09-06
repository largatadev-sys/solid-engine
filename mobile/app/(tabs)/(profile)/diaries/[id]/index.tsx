import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { askForConfirmation } from '../../../../../src/components/ConfirmStation';
import { DiaryActionsSheet } from '../../../../../src/diary/DiaryActionsSheet';
import { DiaryDetailScreen } from '../../../../../src/diary/DiaryDetailScreen';
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
  const handle = me?.handle ?? null;

  function askToDelete(): void {
    const subject = diary.data;
    if (subject === undefined) return;

    setMenuOpen(false);
    askForConfirmation(
      {
        title: deleteDiaryTitle(subject.postcardCount),
        body: deleteDiaryBody(subject.title),
        confirmLabel: DELETE_ACTION,
        cancelLabel: CANCEL_ACTION,
        tone: 'destructive',
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
            showMemoryToast(DELETE_FAILED_TOAST);
          });
      },
    );
  }

  return (
    <>
      <DiaryDetailScreen
        diary={diary.data}
        authorName={me?.displayName ?? ''}
        authorHandle={handle ?? ''}
        owned={owned}
        onOpenAuthor={() => router.push(PROFILE_TAB_ROUTE)}
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
        title={diary.data.title}
        actions={[
          {
            label: EDIT_DIARY_ACTION,
            onPress: () => {
              setMenuOpen(false);
              router.push({ pathname: '/diaries/[id]/edit', params: { id: diary.data.id } });
            },
          },
          { label: DELETE_DIARY_ACTION, destructive: true, onPress: askToDelete },
        ]}
        onDismiss={() => setMenuOpen(false)}
      />
    </>
  );
}
