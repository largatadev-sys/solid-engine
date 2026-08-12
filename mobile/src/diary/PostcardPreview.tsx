import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { comingSoon } from '../components/comingSoon';
import { Icon } from '../components/Icon';
import { stillShowing } from '../components/stillShowing';
import { MediaThumb } from '../media/MediaThumb';
import { spacing } from '../theme';
import {
  diaryScreenColors,
  diaryScreenMetrics,
  diaryScreenTypography,
} from '../theme/workspaceTokens';
import type { DiaryEntryResponse } from '../types/api';
import {
  PREVIEW_CLOSE,
  PREVIEW_EDIT,
  PREVIEW_HINT,
  PREVIEW_SHARE,
} from './diaryCopy';
import { dragToScroll, PAGING, SNAP_CHILD_STYLE, SNAP_STYLE } from './photoStripScroll';
import { snapshotEyebrow } from './postcardAnatomy';
import { pageOfOffset, previewCount } from './postcardCarousel';


interface PostcardPreviewProps {
  readonly entry: DiaryEntryResponse | null;
  readonly tripTitle: string | null;
  readonly onEdit?: (entry: DiaryEntryResponse) => void;
  readonly onDismiss: () => void;
}


export function PostcardPreview({ entry, tripTitle, onEdit, onDismiss }: PostcardPreviewProps) {
  const [page, setPage] = useState(0);
  const [photoWidth, setPhotoWidth] = useState(0);
  const [drag] = useState(dragToScroll);
  const retained = useRef<DiaryEntryResponse | null>(null);

  if (entry !== null) retained.current = entry;
  const showing = stillShowing(entry, retained.current);

  useEffect(() => {
    if (entry !== null) setPage(0);
  }, [entry]);

  if (showing === null) return null;

  const photoCount = showing.photos.length;
  const count = previewCount(page, photoCount);

  const measure = (event: LayoutChangeEvent) => setPhotoWidth(event.nativeEvent.layout.width);

  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(pageOfOffset(event.nativeEvent.contentOffset.x, photoWidth, photoCount));

  return (
    <Modal visible={entry !== null} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.scrim} onPress={onDismiss} accessibilityLabel={PREVIEW_CLOSE}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <View style={styles.stage} onLayout={measure}>
            <ScrollView
              horizontal
              {...PAGING}
              style={SNAP_STYLE}
              showsHorizontalScrollIndicator={false}
              onScroll={settle}
              onMomentumScrollEnd={settle}
              scrollEventThrottle={16}
              {...drag}
            >
              {showing.photos.map((photo, index) => (
                <MediaThumb
                  key={photo.id}
                  url={photo.url}
                  full
                  style={{ ...styles.photo, ...SNAP_CHILD_STYLE, width: photoWidth }}
                  accessibilityLabel={`${showing.activityTitle}, photo ${index + 1}`}
                />
              ))}
            </ScrollView>

            <Pressable
              style={styles.close}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={PREVIEW_CLOSE}
            >
              <Icon
                name="close"
                size={diaryScreenMetrics.closeGlyph}
                color={diaryScreenColors.onPhoto}
              />
            </Pressable>

            {photoCount > 1 && (
              <View style={styles.dots}>
                {showing.photos.map((photo, index) => (
                  <View key={photo.id} style={index === page ? styles.dotActive : styles.dot} />
                ))}
              </View>
            )}
          </View>

          <View style={styles.body}>
            <View style={styles.eyebrowRow}>
              <Text style={styles.eyebrow}>{snapshotEyebrow(showing)}</Text>
              {count !== null && <Text style={styles.count}>{count}</Text>}
            </View>

            <Text style={styles.title}>{showing.activityTitle}</Text>

            {showing.caption !== null && <Text style={styles.caption}>{showing.caption}</Text>}

            {tripTitle !== null && <Text style={styles.trip}>{tripTitle}</Text>}
          </View>

          <View style={styles.actions}>
            {onEdit !== undefined && (
              <>
                <Pressable
                  style={styles.action}
                  onPress={() => onEdit(showing)}
                  accessibilityRole="button"
                  accessibilityLabel={PREVIEW_EDIT}
                >
                  <Icon
                    name="pencil"
                    size={diaryScreenMetrics.actionGlyph}
                    color={diaryScreenColors.editInk}
                  />
                  <Text style={styles.editLabel}>{PREVIEW_EDIT}</Text>
                </Pressable>

                <View style={styles.actionDivider} />
              </>
            )}

            <Pressable
              style={styles.action}
              onPress={() => comingSoon('share')}
              accessibilityRole="button"
              accessibilityLabel={PREVIEW_SHARE}
            >
              <Icon
                name="share"
                size={diaryScreenMetrics.actionGlyph}
                color={diaryScreenColors.shareInk}
              />
              <Text style={styles.shareLabel}>{PREVIEW_SHARE}</Text>
            </Pressable>
          </View>
        </Pressable>

        <Text style={styles.hint}>{PREVIEW_HINT}</Text>
      </Pressable>
    </Modal>
  );
}


const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: diaryScreenColors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: diaryScreenMetrics.previewCardWidth,
    maxWidth: '100%',
    backgroundColor: diaryScreenColors.card,
    borderRadius: diaryScreenMetrics.previewRadius,
    overflow: 'hidden',
  },
  stage: {
    height: diaryScreenMetrics.previewPhotoHeight,
    backgroundColor: diaryScreenColors.photoWell,
  },
  photo: {
    height: diaryScreenMetrics.previewPhotoHeight,
  },
  close: {
    position: 'absolute',
    top: diaryScreenMetrics.previewInset,
    right: diaryScreenMetrics.previewInset,
    width: diaryScreenMetrics.closeButton,
    height: diaryScreenMetrics.closeButton,
    borderRadius: diaryScreenMetrics.closeButton / 2,
    backgroundColor: diaryScreenColors.closeInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    position: 'absolute',
    bottom: diaryScreenMetrics.previewInset,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs2,
  },
  dot: {
    width: diaryScreenMetrics.previewDot,
    height: diaryScreenMetrics.previewDot,
    borderRadius: diaryScreenMetrics.previewDot / 2,
    backgroundColor: diaryScreenColors.dotIdle,
  },
  dotActive: {
    width: diaryScreenMetrics.previewDot,
    height: diaryScreenMetrics.previewDot,
    borderRadius: diaryScreenMetrics.previewDot / 2,
    backgroundColor: diaryScreenColors.onPhoto,
  },
  body: {
    padding: spacing.md2,
    gap: spacing.sm,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eyebrow: {
    ...diaryScreenTypography.eyebrow,
    color: diaryScreenColors.eyebrow,
  },
  count: {
    ...diaryScreenTypography.previewCount,
    color: diaryScreenColors.previewCount,
    flexGrow: 0,
    flexShrink: 0,
  },
  title: {
    ...diaryScreenTypography.previewTitle,
    color: diaryScreenColors.caption,
  },
  caption: {
    ...diaryScreenTypography.previewCaption,
    color: diaryScreenColors.previewCaption,
  },
  trip: {
    ...diaryScreenTypography.previewTrip,
    color: diaryScreenColors.previewTrip,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: diaryScreenColors.divider,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm3,
  },
  actionDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: diaryScreenColors.divider,
  },
  editLabel: {
    ...diaryScreenTypography.action,
    color: diaryScreenColors.editInk,
  },
  shareLabel: {
    ...diaryScreenTypography.action,
    color: diaryScreenColors.shareInk,
  },
  hint: {
    ...diaryScreenTypography.hint,
    color: diaryScreenColors.hint,
    position: 'absolute',
    bottom: spacing.xl,
    textAlign: 'center',
  },
});
