import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { MediaThumb } from '../media/MediaThumb';
import { useSafeBack } from '../navigation/safeBack';
import { initialsFor } from '../onboarding/initials';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';
import type { DiaryDayResponse, DiaryPostcardResponse, DiaryResponse } from '../types/api';
import {
  ADD_A_DAY_CTA,
  ADD_POSTCARD_CTA,
  BACK_LABEL,
  NO_POSTCARDS_ON_THIS_DAY,
  dayMetaLine,
  dayOrdinalLabel,
  detailMetaLine,
} from './memoryCopy';
import { MemoryIcon } from './MemoryIcon';


interface DiaryDetailScreenProps {
  readonly diary: DiaryResponse;
  readonly authorName: string;
  readonly authorHandle: string;
  readonly authorAvatarUrl: string | null;
  readonly owned: boolean;
  readonly onOpenAuthor: () => void;
  readonly onOpenPostcard: (postcardId: string) => void;
  readonly onAddPostcard?: (dayId: string) => void;
  readonly onAddDay?: () => void;
  readonly onDiaryMenu?: () => void;
}


export function DiaryDetailScreen({
  diary,
  authorName,
  authorHandle,
  authorAvatarUrl,
  owned,
  onOpenAuthor,
  onOpenPostcard,
  onAddPostcard,
  onAddDay,
  onDiaryMenu,
}: DiaryDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const goBack = useSafeBack();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <View style={styles.cover}>
        <MediaThumb
          url={diary.cover?.url ?? null}
          full
          style={styles.fill}
          accessibilityLabel={diary.title}
          fallback={<View style={styles.fill} />}
        />

        <View style={styles.coverShade}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="coverShade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={memoryColors.title} stopOpacity={0} />
                <Stop offset="1" stopColor={memoryColors.title} stopOpacity={0.7} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#coverShade)" />
          </Svg>
        </View>

        <View style={[styles.overlayBar, { top: insets.top + 4 }]}>
          <OverlayButton label={BACK_LABEL} icon="chevronLeft" onPress={goBack} />
          {owned && onDiaryMenu !== undefined ? (
            <OverlayButton label={`${diary.title} menu`} icon="kebab" onPress={onDiaryMenu} />
          ) : (
            <View style={styles.overlayButton} />
          )}
        </View>

        <View style={styles.coverText}>
          <Text style={styles.coverTitle}>{diary.title}</Text>
          <Text style={styles.coverMeta}>
            {detailMetaLine(diary.destination, diary.dayCount, diary.startDate, diary.endDate)}
          </Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => StyleSheet.flatten([styles.authorRow, pressed && !owned ? styles.pressed : null])}
        disabled={owned}
        accessibilityRole="button"
        accessibilityLabel={authorName}
        onPress={onOpenAuthor}
      >
        <MediaThumb
          url={authorAvatarUrl}
          style={styles.avatar}
          fallbackStyle={styles.avatarWell}
          accessibilityLabel={authorName}
          fallback={<Text style={styles.initials}>{initialsFor(authorName, null)}</Text>}
        />
        <Text style={styles.authorInk} numberOfLines={1}>
          <Text style={styles.authorName}>{authorName}</Text> · @{authorHandle}
        </Text>
        {!owned && (
          <MemoryIcon name="chevronRight" size={14} color={memoryColors.faint} strokeWidth={2.4} />
        )}
      </Pressable>

      <View style={styles.days}>
        {diary.days.map((day) => (
          <DayBlock
            key={day.id}
            day={day}
            owned={owned}
            onOpenPostcard={onOpenPostcard}
            onAddPostcard={onAddPostcard}
          />
        ))}

        {owned && onAddDay !== undefined && (
          <Pressable
            style={({ pressed }) => StyleSheet.flatten([styles.addDay, pressed ? styles.addDayPressed : null])}
            accessibilityRole="button"
            accessibilityLabel={ADD_A_DAY_CTA}
            onPress={onAddDay}
          >
            <MemoryIcon name="plus" size={16} color={memoryColors.title} strokeWidth={2} />
            <Text style={styles.addDayInk}>{ADD_A_DAY_CTA}</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}


function OverlayButton({
  label,
  icon,
  onPress,
}: {
  readonly label: string;
  readonly icon: 'chevronLeft' | 'kebab';
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) =>
        StyleSheet.flatten([styles.overlayButton, styles.overlayButtonFilled, pressed ? styles.roundPressed : null])
      }
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
    >
      <MemoryIcon name={icon} size={icon === 'kebab' ? 18 : 20} color={memoryColors.white} />
    </Pressable>
  );
}


function DayBlock({
  day,
  owned,
  onOpenPostcard,
  onAddPostcard,
}: {
  readonly day: DiaryDayResponse;
  readonly owned: boolean;
  readonly onOpenPostcard: (postcardId: string) => void;
  readonly onAddPostcard?: (dayId: string) => void;
}) {
  return (
    <View>
      <View style={styles.dayHead}>
        <View style={styles.dayTitleRow}>
          <Text style={styles.dayTitle}>{dayOrdinalLabel(day.ordinal)}</Text>
          <Text style={styles.dayMeta}>{dayMetaLine(day.date, day.place)}</Text>
        </View>
        {owned && onAddPostcard !== undefined && (
          <Pressable
            style={({ pressed }) => StyleSheet.flatten([pressed ? styles.pressed : null])}
            accessibilityRole="button"
            accessibilityLabel={`${ADD_POSTCARD_CTA} to ${dayOrdinalLabel(day.ordinal)}`}
            onPress={() => onAddPostcard(day.id)}
          >
            <Text style={styles.addPostcard}>{ADD_POSTCARD_CTA}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.dayBody}>
        {day.postcards.length === 0 ? (
          owned ? (
            <View style={styles.emptyDayBox}>
              <Text style={styles.emptyDayInk}>{NO_POSTCARDS_ON_THIS_DAY}</Text>
            </View>
          ) : (
            <Text style={styles.emptyDayInk}>{NO_POSTCARDS_ON_THIS_DAY}</Text>
          )
        ) : (
          day.postcards.map((postcard) => (
            <DayPostcard key={postcard.id} postcard={postcard} onPress={() => onOpenPostcard(postcard.id)} />
          ))
        )}
      </View>
    </View>
  );
}


function DayPostcard({
  postcard,
  onPress,
}: {
  readonly postcard: DiaryPostcardResponse;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => StyleSheet.flatten([styles.postcard, pressed ? styles.pressed : null])}
      accessibilityRole="button"
      accessibilityLabel={postcard.caption ?? 'Postcard'}
      onPress={onPress}
    >
      <MediaThumb
        url={postcard.photos[0]?.url ?? null}
        full
        style={styles.postcardPhoto}
        accessibilityLabel="Postcard"
        fallback={<View style={styles.fill} />}
      />
      {postcard.caption !== null && <Text style={styles.postcardCaption}>{postcard.caption}</Text>}
    </Pressable>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: memoryColors.screen,
  },
  body: {
    paddingBottom: 24,
  },
  fill: {
    width: '100%',
    height: '100%',
    backgroundColor: memoryColors.wellDivider,
  },
  cover: {
    height: memoryMetrics.detailCover,
    backgroundColor: memoryColors.wellDivider,
  },
  coverShade: {
    ...StyleSheet.absoluteFill,
  },
  overlayBar: {
    position: 'absolute',
    left: memoryMetrics.overlayButtonSide,
    right: memoryMetrics.overlayButtonSide,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overlayButton: {
    width: memoryMetrics.overlayButton,
    height: memoryMetrics.overlayButton,
    borderRadius: memoryMetrics.overlayButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayButtonFilled: {
    backgroundColor: memoryColors.overlayButton,
  },
  roundPressed: {
    transform: [{ scale: memoryMotion.roundPressScale }],
  },
  coverText: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 40,
    paddingHorizontal: memoryMetrics.screenPadding,
    paddingBottom: 16,
    gap: 2,
  },
  coverTitle: {
    ...memoryTypography.screenTitle,
    color: memoryColors.onCover,
  },
  coverMeta: {
    ...memoryTypography.meta13,
    color: memoryColors.onCoverMuted,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: memoryMetrics.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: memoryColors.divider,
  },
  avatar: {
    width: memoryMetrics.avatarSmall,
    height: memoryMetrics.avatarSmall,
    borderRadius: memoryMetrics.avatarSmall / 2,
    flexShrink: 0,
  },
  avatarWell: {
    backgroundColor: memoryColors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...memoryTypography.eyebrow,
    letterSpacing: 0,
    color: memoryColors.accentDeep,
  },
  authorInk: {
    ...memoryTypography.authorMeta,
    color: memoryColors.title,
    flex: 1,
  },
  authorName: {
    ...memoryTypography.authorName,
  },
  days: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 6,
  },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 8,
  },
  dayTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  dayTitle: {
    ...memoryTypography.dayTitle,
    color: memoryColors.title,
  },
  dayMeta: {
    ...memoryTypography.meta13,
    color: memoryColors.muted,
    flexShrink: 1,
  },
  addPostcard: {
    ...memoryTypography.cardMetaStrong,
    color: memoryColors.accent,
  },
  dayBody: {
    gap: 8,
    paddingBottom: 12,
  },
  emptyDayBox: {
    borderWidth: memoryMetrics.dashedWidth,
    borderStyle: 'dashed',
    borderColor: memoryColors.dashed,
    borderRadius: memoryMetrics.dayPhotoRadius,
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyDayInk: {
    ...memoryTypography.meta13,
    color: memoryColors.faint,
  },
  postcard: {
    gap: 8,
  },
  postcardPhoto: {
    height: memoryMetrics.dayPhoto,
    borderRadius: memoryMetrics.dayPhotoRadius,
    backgroundColor: memoryColors.wellDivider,
    overflow: 'hidden',
  },
  postcardCaption: {
    ...memoryTypography.caption,
    color: memoryColors.title,
  },
  addDay: {
    marginTop: 8,
    height: memoryMetrics.addDayHeight,
    borderRadius: memoryMetrics.addDayRadius,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addDayPressed: {
    backgroundColor: memoryColors.paper,
    transform: [{ scale: memoryMotion.ctaPressScale }],
  },
  addDayInk: {
    ...memoryTypography.outlinedButton,
    color: memoryColors.title,
  },
  pressed: {
    opacity: memoryMotion.pressOpacity,
  },
});
