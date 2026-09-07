import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { DiaryActionsSheet } from '../../../../../src/diary/DiaryActionsSheet';
import { FilingPicker } from '../../../../../src/diary/FilingPicker';
import { askMemoryConfirmation } from '../../../../../src/diary/MemoryConfirm';
import { PostcardDetailScreen, type DiaryRow } from '../../../../../src/diary/PostcardDetailScreen';
import { showMemoryToast } from '../../../../../src/diary/MemoryToast';
import {
  ADD_TO_DIARY_ACTION,
  CANCEL_ACTION,
  DELETE_ACTION,
  DELETE_FAILED_TOAST,
  EDIT_POSTCARD_ACTION,
  POSTCARD_CONTEXT_LABEL,
  POSTCARD_DELETED_TOAST,
  addedToDiaryToast,
  deletePostcardBody,
  deletePostcardTitle,
} from '../../../../../src/diary/memoryCopy';
import { useMe } from '../../../../../src/hooks/useMe';
import { memoryRepository } from '../../../../../src/repositories/memoryRepository';
import {
  useDiary,
  useDiarySections,
  useMemoryRefresh,
  usePostcard,
} from '../../../../../src/query/memoryQueries';
import { colors } from '../../../../../src/theme';


export default function PostcardDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state } = useMe();
  const me = state.kind === 'ok' ? state.me : null;
  const postcard = usePostcard(id ?? null);
  const sections = useDiarySections(me?.handle ?? null);
  const home = useDiary(postcard.data?.diaryId ?? null);
  const refresh = useMemoryRefresh();
  const [menuOpen, setMenuOpen] = useState(false);
  const [filing, setFiling] = useState(false);
  const [filingBusy, setFilingBusy] = useState(false);
  const [filingFailed, setFilingFailed] = useState(false);

  if (postcard.data === undefined) {
    return <ActivityIndicator color={colors.accent} />;
  }

  const author = postcard.data.author;
  const owned = me !== null && author !== null && me.id === author.id;
  const loose = postcard.data.diaryDayId === null;

  const homeDiary = home.data ?? null;
  const homeDay =
    homeDiary?.days.find((day) => day.id === postcard.data?.diaryDayId) ?? null;
  const diaryRow: DiaryRow | null =
    homeDiary !== null && homeDay !== null
      ? { title: homeDiary.title, ordinal: homeDay.ordinal, date: homeDay.date }
      : null;

  function askToDelete(): void {
    const subject = postcard.data;
    if (subject === undefined) return;

    setMenuOpen(false);
    askMemoryConfirmation(
      {
        title: deletePostcardTitle(),
        body: deletePostcardBody(),
        confirmLabel: DELETE_ACTION,
        cancelLabel: CANCEL_ACTION,
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
            showMemoryToast(DELETE_FAILED_TOAST, 'failure');
          });
      },
    );
  }

  function file(diaryId: string, dayId: string): void {
    const subject = postcard.data;
    if (subject === undefined) return;

    setFilingBusy(true);
    setFilingFailed(false);
    void memoryRepository
      .fileOnDay(subject.id, diaryId, dayId)
      .then(() => {
        const title = sections.data?.diaries.find((diary) => diary.id === diaryId)?.title ?? '';
        setFiling(false);
        refresh(me?.handle ?? null);
        showMemoryToast(addedToDiaryToast(title));
      })
      .catch(() => setFilingFailed(true))
      .finally(() => setFilingBusy(false));
  }

  return (
    <>
      <PostcardDetailScreen
        postcard={postcard.data}
        diaryRow={diaryRow}
        authorName={author?.displayName ?? ''}
        authorHandle={author?.handle ?? ''}
        authorAvatarUrl={author?.avatarUrl ?? null}
        owned={owned}
        onOpenDiary={
          postcard.data.diaryId === null
            ? undefined
            : () =>
                router.push({
                  pathname: '/diaries/[id]',
                  params: {
                    id: postcard.data?.diaryId as string,
                    ...(postcard.data?.diaryDayId == null
                      ? {}
                      : { day: postcard.data?.diaryDayId as string }),
                  },
                })
        }
        onMenu={() => setMenuOpen(true)}
      />

      <DiaryActionsSheet
        open={menuOpen}
        contextLabel={POSTCARD_CONTEXT_LABEL}
        actions={[
          {
            label: EDIT_POSTCARD_ACTION,
            icon: 'pencil',
            onPress: () => {
              setMenuOpen(false);
              router.push({ pathname: '/postcards/[id]/edit', params: { id: postcard.data?.id as string } });
            },
          },
          ...(loose
            ? [
                {
                  label: ADD_TO_DIARY_ACTION,
                  icon: 'bookPlus' as const,
                  onPress: () => {
                    setMenuOpen(false);
                    setFiling(true);
                  },
                },
              ]
            : []),
          { label: DELETE_ACTION, icon: 'trash', destructive: true, onPress: askToDelete },
        ]}
        onDismiss={() => setMenuOpen(false)}
      />

      <FilingPicker
        open={filing}
        diaries={sections.data?.diaries ?? []}
        failed={filingFailed}
        filing={filingBusy}
        onFile={file}
        onNewDiary={() => {
          setFiling(false);
          router.push('/diaries/new');
        }}
        onDismiss={() => setFiling(false)}
      />
    </>
  );
}
