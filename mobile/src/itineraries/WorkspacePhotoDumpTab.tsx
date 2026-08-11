import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { confirmWith } from '../components/confirmDestructive';
import { MediaThumb } from '../media/MediaThumb';
import { PhotoDumpPreview } from '../media/PhotoDumpPreview';
import { flattenPhotoDumpPages, photoDumpTiles } from '../media/photoDumpGrid';
import {
  PHOTO_DUMP_ADD_LABEL,
  PHOTO_DUMP_ARCHIVED_NOTE,
  PHOTO_DUMP_EMPTY_BODY,
  PHOTO_DUMP_EMPTY_TITLE,
  PHOTO_DUMP_LOAD_FAILURE,
  PHOTO_DUMP_TILE_LABEL,
  photoDumpDeleteWording,
} from '../media/photoDumpMessages';
import { usePhotoAction } from '../media/usePhotoAction';
import {
  useAddPhotoDumpEntries,
  usePhotoDump,
  useRemovePhotoDumpEntry,
} from '../query/itineraryQueries';
import { colors } from '../theme';
import {
  workspaceColors,
  workspaceRadii,
  workspaceTypography,
} from '../theme/workspaceTokens';
import type { PhotoDumpEntryResponse } from '../types/api';


interface WorkspacePhotoDumpTabProps {
  readonly itineraryId: string;
  readonly myId: string | undefined;
  readonly isOwner: boolean;
  readonly archived: boolean;
}


export function WorkspacePhotoDumpTab({
  itineraryId,
  myId,
  isOwner,
  archived,
}: WorkspacePhotoDumpTabProps) {
  const pool = usePhotoDump(itineraryId);
  const add = useAddPhotoDumpEntries(itineraryId);
  const remove = useRemovePhotoDumpEntry(itineraryId);
  const photoAction = usePhotoAction();
  const [openedId, setOpenedId] = useState<string | null>(null);

  if (pool.isPending) {
    return (
      <View style={styles.body}>
        <ActivityIndicator color={workspaceColors.accent} />
      </View>
    );
  }

  if (pool.isError) {
    return (
      <View style={styles.body}>
        <Text style={styles.notice}>{PHOTO_DUMP_LOAD_FAILURE}</Text>
      </View>
    );
  }

  const photos = flattenPhotoDumpPages(pool.data?.pages);
  const tiles = photoDumpTiles(photos, myId, isOwner, archived);
  const busy = add.isPending || remove.isPending;
  const opened = tiles.find((tile) => tile.photo.id === openedId) ?? null;

  const onDelete = (photo: PhotoDumpEntryResponse) => {
    confirmWith(photoDumpDeleteWording(photo.uploadedBy === myId), () => {
      setOpenedId(null);
      void photoAction.run(() => remove.mutateAsync(photo.id));
    });
  };

  return (
    <View style={styles.body}>
      {archived && <Text style={styles.notice}>{PHOTO_DUMP_ARCHIVED_NOTE}</Text>}

      {photoAction.failure !== undefined && (
        <Text style={styles.failure}>{photoAction.failure}</Text>
      )}

      {tiles.length === 0 && !archived && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{PHOTO_DUMP_EMPTY_TITLE}</Text>
          <Text style={styles.emptyBody}>{PHOTO_DUMP_EMPTY_BODY}</Text>
        </View>
      )}

      <View style={styles.grid}>
        {tiles.map(({ photo }) => (
          <Pressable
            key={photo.id}
            style={styles.tile}
            onPress={() => setOpenedId(photo.id)}
            accessibilityRole="button"
            accessibilityLabel={PHOTO_DUMP_TILE_LABEL}
          >
            <MediaThumb
              url={photo.url}
              style={styles.tileImage}
              accessibilityLabel={PHOTO_DUMP_TILE_LABEL}
            />
          </Pressable>
        ))}

        {!archived && (
          <Pressable
            style={styles.addTile}
            disabled={busy}
            onPress={() =>
              void photoAction.pickManyAndRun(PHOTO_DUMP_BATCH_LIMIT, (photos) =>
                add.mutateAsync(photos),
              )
            }
            accessibilityRole="button"
            accessibilityLabel={PHOTO_DUMP_ADD_LABEL}
          >
            <Text style={styles.addLabel}>{busy ? '…' : PHOTO_DUMP_ADD_LABEL}</Text>
          </Pressable>
        )}
      </View>

      <PhotoDumpPreview
        tile={opened}
        busy={busy}
        onDelete={() => opened !== null && onDelete(opened.photo)}
        onDismiss={() => setOpenedId(null)}
      />

      {pool.hasNextPage === true && (
        <Pressable
          style={styles.more}
          disabled={pool.isFetchingNextPage}
          onPress={() => void pool.fetchNextPage()}
          accessibilityRole="button"
          accessibilityLabel="Load more photos"
        >
          <Text style={styles.moreLabel}>
            {pool.isFetchingNextPage ? 'Loading…' : 'Load more photos'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}


const TILE = 104;

const PHOTO_DUMP_BATCH_LIMIT = 20;


const styles = StyleSheet.create({
  body: {
    padding: 16,
    gap: 12,
  },
  notice: {
    ...workspaceTypography.note,
    color: workspaceColors.muted,
  },
  failure: {
    ...workspaceTypography.note,
    color: colors.danger,
  },
  empty: {
    gap: 4,
  },
  emptyTitle: {
    ...workspaceTypography.memberName,
    color: workspaceColors.title,
  },
  emptyBody: {
    ...workspaceTypography.note,
    color: workspaceColors.muted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: workspaceRadii.card,
    overflow: 'hidden',
    backgroundColor: workspaceColors.hairline,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  addTile: {
    width: TILE,
    height: TILE,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: workspaceColors.hairline,
    borderRadius: workspaceRadii.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    ...workspaceTypography.note,
    color: workspaceColors.muted,
    textAlign: 'center',
  },
  more: {
    alignSelf: 'flex-start',
  },
  moreLabel: {
    ...workspaceTypography.note,
    color: workspaceColors.accent,
  },
});
