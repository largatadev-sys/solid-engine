import { useRouter } from 'expo-router';
import { useState } from 'react';
import { DiaryActionsSheet } from '../diary/DiaryActionsSheet';
import { FilingPicker } from '../diary/FilingPicker';
import { askMemoryConfirmation } from '../diary/MemoryConfirm';
import { MemoryDiaryTab } from '../diary/MemoryDiaryTab';
import { showMemoryToast } from '../diary/MemoryToast';
import {
  ADD_TO_DIARY_ACTION,
  CANCEL_ACTION,
  DELETE_ACTION,
  DELETE_DIARY_ACTION,
  DELETE_FAILED_TOAST,
  DIARY_DELETED_TOAST,
  EDIT_POSTCARD_ACTION,
  EDIT_DIARY_ACTION,
  POSTCARD_CONTEXT_LABEL,
  POSTCARD_DELETED_TOAST,
  addedToDiaryToast,
  deleteDiaryBody,
  deleteDiaryTitle,
  deletePostcardBody,
  deletePostcardTitle,
} from '../diary/memoryCopy';
import type { MemoryExits } from '../diary/useMemoryExits';
import { useMemoryRefresh } from '../query/memoryQueries';
import { memoryRepository } from '../repositories/memoryRepository';
import type {
  DiaryPostcardResponse,
  DiarySectionResponse,
  DiarySectionsResponse,
} from '../types/api';


interface DiaryTabPaneProps {
  readonly handle: string | null;
  readonly sections: DiarySectionsResponse;
  readonly exits: MemoryExits;
}

type Menu =
  | { readonly kind: 'diary'; readonly section: DiarySectionResponse }
  | { readonly kind: 'postcard'; readonly postcard: DiaryPostcardResponse }
  | null;


export function DiaryTabPane({ handle, sections, exits }: DiaryTabPaneProps) {
  const router = useRouter();
  const refresh = useMemoryRefresh();
  const [menu, setMenu] = useState<Menu>(null);
  const [filingPostcard, setFilingPostcard] = useState<DiaryPostcardResponse | null>(null);
  const [filingBusy, setFilingBusy] = useState(false);
  const [filingFailed, setFilingFailed] = useState(false);

  function deleteDiary(section: DiarySectionResponse): void {
    setMenu(null);
    askMemoryConfirmation(
      {
        title: deleteDiaryTitle(section.postcardCount),
        body: deleteDiaryBody(section.title),
        confirmLabel: DELETE_ACTION,
        cancelLabel: CANCEL_ACTION,
      },
      () => {
        exits.begin(section.id);
        void memoryRepository
          .deleteDiary(section.id)
          .then(() => {
            refresh(handle);
            showMemoryToast(DIARY_DELETED_TOAST);
          })
          .catch(() => {
            exits.revert(section.id);
            showMemoryToast(DELETE_FAILED_TOAST, 'failure');
          });
      },
    );
  }

  function deletePostcard(postcard: DiaryPostcardResponse): void {
    setMenu(null);
    askMemoryConfirmation(
      {
        title: deletePostcardTitle(),
        body: deletePostcardBody(),
        confirmLabel: DELETE_ACTION,
        cancelLabel: CANCEL_ACTION,
      },
      () => {
        exits.begin(postcard.id);
        void memoryRepository
          .deletePostcard(postcard.id)
          .then(() => {
            refresh(handle);
            showMemoryToast(POSTCARD_DELETED_TOAST);
          })
          .catch(() => {
            exits.revert(postcard.id);
            showMemoryToast(DELETE_FAILED_TOAST, 'failure');
          });
      },
    );
  }

  function file(diaryId: string, dayId: string): void {
    const postcard = filingPostcard;
    if (postcard === null) return;

    setFilingBusy(true);
    setFilingFailed(false);
    void memoryRepository
      .fileOnDay(postcard.id, diaryId, dayId)
      .then(() => {
        const title = sections.diaries.find((diary) => diary.id === diaryId)?.title ?? '';
        setFilingPostcard(null);
        exits.begin(postcard.id);
        refresh(handle);
        showMemoryToast(addedToDiaryToast(title));
      })
      .catch(() => setFilingFailed(true))
      .finally(() => setFilingBusy(false));
  }

  const actions =
    menu === null
      ? []
      : menu.kind === 'diary'
        ? [
            {
              label: EDIT_DIARY_ACTION,
              icon: 'pencil' as const,
              onPress: () => {
                setMenu(null);
                router.push({ pathname: '/diaries/[id]/edit', params: { id: menu.section.id } });
              },
            },
            {
              label: DELETE_DIARY_ACTION,
              icon: 'trash' as const,
              destructive: true,
              onPress: () => deleteDiary(menu.section),
            },
          ]
        : [
            {
              label: EDIT_POSTCARD_ACTION,
              icon: 'pencil' as const,
              onPress: () => {
                setMenu(null);
                router.push({ pathname: '/postcards/[id]/edit', params: { id: menu.postcard.id } });
              },
            },
            {
              label: ADD_TO_DIARY_ACTION,
              icon: 'bookPlus' as const,
              onPress: () => {
                setMenu(null);
                setFilingFailed(false);
                setFilingPostcard(menu.postcard);
              },
            },
            {
              label: DELETE_ACTION,
              icon: 'trash' as const,
              destructive: true,
              onPress: () => deletePostcard(menu.postcard),
            },
          ];

  return (
    <>
      <MemoryDiaryTab
        sections={sections}
        owned
        exiting={exits.exiting}
        entering={exits.entering}
        onOpenDiary={(diaryId) => router.push({ pathname: '/diaries/[id]', params: { id: diaryId } })}
        onOpenPostcard={(postcardId) =>
          router.push({ pathname: '/postcards/[id]', params: { id: postcardId } })
        }
        onOpenItinerary={(itineraryId) =>
          router.push({ pathname: '/showcase/[id]', params: { id: itineraryId } })
        }
        onDiaryMenu={(section) => setMenu({ kind: 'diary', section })}
        onPostcardMenu={(postcard) => setMenu({ kind: 'postcard', postcard })}
      />

      <DiaryActionsSheet
        open={menu !== null}
        contextLabel={
          menu === null ? '' : menu.kind === 'diary' ? menu.section.title : POSTCARD_CONTEXT_LABEL
        }
        actions={actions}
        onDismiss={() => setMenu(null)}
      />

      <FilingPicker
        open={filingPostcard !== null}
        diaries={sections.diaries}
        failed={filingFailed}
        filing={filingBusy}
        onFile={file}
        onNewDiary={() => {
          setFilingPostcard(null);
          router.push('/diaries/new');
        }}
        onDismiss={() => setFilingPostcard(null)}
      />
    </>
  );
}
