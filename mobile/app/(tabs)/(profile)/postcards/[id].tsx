import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { askForConfirmation } from '../../../../src/components/ConfirmStation';
import { DiaryActionsSheet } from '../../../../src/diary/DiaryActionsSheet';
import { FilingPicker } from '../../../../src/diary/FilingPicker';
import { PostcardDetailScreen } from '../../../../src/diary/PostcardDetailScreen';
import { showMemoryToast } from '../../../../src/diary/MemoryToast';
import {
  ADD_TO_DIARY_ACTION,
  CANCEL_ACTION,
  DELETE_ACTION,
  DELETE_FAILED_TOAST,
  DELETE_POSTCARD_ACTION,
  POSTCARD_DELETED_TOAST,
  addedToDiaryToast,
  deletePostcardBody,
  deletePostcardTitle,
} from '../../../../src/diary/memoryCopy';
import { useMe } from '../../../../src/hooks/useMe';
import { memoryRepository } from '../../../../src/repositories/memoryRepository';
import {
  useDiarySections,
  useMemoryRefresh,
  usePostcard,
} from '../../../../src/query/memoryQueries';
import { PROFILE_TAB_ROUTE } from '../../../../src/navigation/authRoutes';
import { colors } from '../../../../src/theme';


export default function PostcardDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state } = useMe();
  const me = state.kind === 'ok' ? state.me : null;
  const postcard = usePostcard(id ?? null);
  const sections = useDiarySections(me?.handle ?? null);
  const refresh = useMemoryRefresh();
  const [menuOpen, setMenuOpen] = useState(false);
  const [filing, setFiling] = useState(false);
  const [filingFailed, setFilingFailed] = useState(false);

  if (postcard.data === undefined) {
    return <ActivityIndicator color={colors.accent} />;
  }

  const owned = me !== null;
  const loose = postcard.data.diaryDayId === null;
  const diaryTitle =
    sections.data?.diaries.find((diary) => diary.id === postcard.data?.diaryId)?.title ?? null;

  function askToDelete(): void {
    const subject = postcard.data;
    if (subject === undefined) return;

    setMenuOpen(false);
    askForConfirmation(
      {
        title: deletePostcardTitle(),
        body: deletePostcardBody(),
        confirmLabel: DELETE_ACTION,
        cancelLabel: CANCEL_ACTION,
        tone: 'destructive',
      },
      () => {
        router.back();
        void memoryRepository
          .deletePostcard(subject.id)
          .then(() => {
            refresh(me?.handle ?? null);
            showMemoryToast(POSTCARD_DELETED_TOAST);
          })
          .catch(() => {
            refresh(me?.handle ?? null);
            showMemoryToast(DELETE_FAILED_TOAST);
          });
      },
    );
  }

  function file(diaryId: string, dayId: string): void {
    const subject = postcard.data;
    if (subject === undefined) return;

    setFilingFailed(false);
    void memoryRepository
      .fileOnDay(subject.id, diaryId, dayId)
      .then(() => {
        const title = sections.data?.diaries.find((diary) => diary.id === diaryId)?.title ?? '';
        setFiling(false);
        refresh(me?.handle ?? null);
        showMemoryToast(addedToDiaryToast(title));
      })
      .catch(() => setFilingFailed(true));
  }

  return (
    <>
      <PostcardDetailScreen
        postcard={postcard.data}
        diaryTitle={diaryTitle}
        authorName={me?.displayName ?? ''}
        authorHandle={me?.handle ?? ''}
        owned={owned}
        onOpenAuthor={() => router.push(PROFILE_TAB_ROUTE)}
        onOpenDiary={
          postcard.data.diaryId === null
            ? undefined
            : () =>
                router.push({
                  pathname: '/diaries/[id]',
                  params: { id: postcard.data?.diaryId as string },
                })
        }
        onMenu={() => setMenuOpen(true)}
      />

      <DiaryActionsSheet
        open={menuOpen}
        title={postcard.data.caption ?? ''}
        actions={[
          ...(loose
            ? [
                {
                  label: ADD_TO_DIARY_ACTION,
                  onPress: () => {
                    setMenuOpen(false);
                    setFiling(true);
                  },
                },
              ]
            : []),
          { label: DELETE_POSTCARD_ACTION, destructive: true, onPress: askToDelete },
        ]}
        onDismiss={() => setMenuOpen(false)}
      />

      <FilingPicker
        open={filing}
        diaries={sections.data?.diaries ?? []}
        failed={filingFailed}
        onFile={file}
        onDismiss={() => setFiling(false)}
      />
    </>
  );
}
