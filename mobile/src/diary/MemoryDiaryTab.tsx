import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { MediaThumb } from '../media/MediaThumb';
import { memoryColors, memoryMetrics, memoryMotion, memoryTypography } from '../theme/memoryTokens';
import type {
  DiaryPostcardResponse,
  DiarySectionResponse,
  DiarySectionsResponse,
} from '../types/api';
import {
  DIARY_TAB_EMPTY_BODY,
  DIARY_TAB_EMPTY_TITLE,
  VIEW_ITINERARY_LINK,
  dayOrdinalLabel,
  looseMetaLine,
  photoIndexPill,
  sectionMetaLine,
} from './memoryCopy';
import { MemoryIcon } from './MemoryIcon';


interface MemoryDiaryTabProps {
  readonly sections: DiarySectionsResponse;
  readonly owned: boolean;
  readonly onOpenDiary: (diaryId: string) => void;
  readonly onOpenPostcard: (postcardId: string) => void;
  readonly onOpenItinerary: (itineraryId: string) => void;
  readonly onDiaryMenu?: (section: DiarySectionResponse) => void;
  readonly onPostcardMenu?: (postcard: DiaryPostcardResponse) => void;
  readonly exiting?: readonly string[];
  readonly entering?: readonly string[];
}


export function MemoryDiaryTab({
  sections,
  owned,
  onOpenDiary,
  onOpenPostcard,
  onOpenItinerary,
  onDiaryMenu,
  onPostcardMenu,
  exiting = [],
  entering = [],
}: MemoryDiaryTabProps) {
  const [collapsed, setCollapsed] = useState<readonly string[]>([]);

  if (sections.diaries.length === 0 && sections.loosePostcards.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <MemoryIcon name="bookPlain" size={24} color={memoryColors.accent} strokeWidth={1.6} />
        </View>
        <Text style={styles.emptyTitle}>{DIARY_TAB_EMPTY_TITLE}</Text>
        <Text style={styles.emptyBody}>{DIARY_TAB_EMPTY_BODY}</Text>
      </View>
    );
  }

  return (
    <View style={styles.pane}>
      {sections.loosePostcards.map((postcard) => (
        <MotionRow
          key={postcard.id}
          exiting={exiting.includes(postcard.id)}
          entering={entering.includes(postcard.id)}
        >
          <LooseCard
            postcard={postcard}
            onPress={() => onOpenPostcard(postcard.id)}
            onMenu={owned && onPostcardMenu !== undefined ? () => onPostcardMenu(postcard) : undefined}
          />
        </MotionRow>
      ))}

      {sections.diaries.map((section) => (
        <MotionRow
          key={section.id}
          exiting={exiting.includes(section.id)}
          entering={entering.includes(section.id)}
        >
          <Section
            section={section}
            collapsed={collapsed.includes(section.id)}
            onToggle={() =>
              setCollapsed((current) =>
                current.includes(section.id)
                  ? current.filter((id) => id !== section.id)
                  : [...current, section.id],
              )
            }
            onOpen={() => onOpenDiary(section.id)}
            onOpenPostcard={onOpenPostcard}
            onOpenItinerary={onOpenItinerary}
            onMenu={owned && onDiaryMenu !== undefined ? () => onDiaryMenu(section) : undefined}
          />
        </MotionRow>
      ))}
    </View>
  );
}


function LooseCard({
  postcard,
  onPress,
  onMenu,
}: {
  readonly postcard: DiaryPostcardResponse;
  readonly onPress: () => void;
  readonly onMenu?: () => void;
}) {
  return (
    <View style={styles.looseCard}>
      <Pressable accessibilityRole="button" accessibilityLabel={postcard.caption ?? 'Postcard'} onPress={onPress}>
        <View style={styles.loosePhoto}>
          <MediaThumb
            url={postcard.photos[0]?.url ?? null}
            style={styles.fill}
            accessibilityLabel="Postcard"
            fallback={<View style={styles.fill} />}
          />
          {postcard.photos.length > 1 && (
            <View style={styles.photoPill}>
              <Text style={styles.photoPillInk}>{photoIndexPill(1, postcard.photos.length)}</Text>
            </View>
          )}
        </View>
      </Pressable>

      <View style={styles.looseBody}>
        <View style={styles.looseCaptionRow}>
          <Pressable style={styles.looseCaptionPress} accessibilityRole="button" accessibilityLabel={postcard.caption ?? 'Postcard'} onPress={onPress}>
            <Text style={styles.looseCaption}>{postcard.caption ?? ''}</Text>
          </Pressable>
          {onMenu !== undefined && (
            <Pressable
              style={({ pressed }) => StyleSheet.flatten([styles.kebab, pressed ? styles.pressed : null])}
              accessibilityRole="button"
              accessibilityLabel="Postcard menu"
              onPress={onMenu}
            >
              <MemoryIcon name="kebab" size={memoryMetrics.kebab} color={memoryColors.muted} />
            </Pressable>
          )}
        </View>
        <View style={styles.looseMeta}>
          {postcard.place !== null && (
            <MemoryIcon name="pin" size={12} color={memoryColors.muted} strokeWidth={2.2} />
          )}
          <Text style={styles.looseMetaInk}>{looseMetaLine(postcard.place, postcard.createdAt)}</Text>
        </View>
      </View>
    </View>
  );
}


function Section({
  section,
  collapsed,
  onToggle,
  onOpen,
  onOpenPostcard,
  onOpenItinerary,
  onMenu,
}: {
  readonly section: DiarySectionResponse;
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  readonly onOpen: () => void;
  readonly onOpenPostcard: (postcardId: string) => void;
  readonly onOpenItinerary: (itineraryId: string) => void;
  readonly onMenu?: () => void;
}) {
  const turn = useRef(new Animated.Value(collapsed ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(turn, {
      toValue: collapsed ? 1 : 0,
      duration: memoryMotion.chevronTurnMs,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [collapsed, turn]);

  const postcards = section.days.flatMap((day) =>
    day.postcards.map((postcard) => ({ postcard, ordinal: day.ordinal })),
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Pressable style={styles.sectionIdentity} accessibilityRole="button" accessibilityLabel={section.title} onPress={onOpen}>
          <MediaThumb
            url={section.cover?.thumbUrl ?? null}
            style={styles.sectionThumb}
            accessibilityLabel={section.title}
            fallback={<View style={styles.fill} />}
          />
          <View style={styles.sectionText}>
            <Text style={styles.sectionTitle} numberOfLines={1}>{section.title}</Text>
            <Text style={styles.sectionMeta} numberOfLines={1}>
              {sectionMetaLine(section.destination, section.dayCount)}
            </Text>
            {section.itineraryId !== null && (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={VIEW_ITINERARY_LINK}
                onPress={() => onOpenItinerary(section.itineraryId as string)}
              >
                <Text style={styles.itineraryLink}>{VIEW_ITINERARY_LINK}</Text>
              </Pressable>
            )}
          </View>
        </Pressable>

        {onMenu !== undefined && (
          <Pressable
            style={({ pressed }) => StyleSheet.flatten([styles.sectionControl, styles.sectionKebab, pressed ? styles.pressed : null])}
            accessibilityRole="button"
            accessibilityLabel={`${section.title} menu`}
            onPress={onMenu}
          >
            <MemoryIcon name="kebab" size={memoryMetrics.kebab} color={memoryColors.muted} />
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => StyleSheet.flatten([styles.sectionControl, styles.sectionChevron, pressed ? styles.pressed : null])}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? `Expand ${section.title}` : `Collapse ${section.title}`}
          onPress={onToggle}
        >
          <Animated.View
            style={{
              transform: [
                { rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
              ],
            }}
          >
            <MemoryIcon name="chevronUp" size={16} color={memoryColors.chevronIdle} strokeWidth={2} />
          </Animated.View>
        </Pressable>
      </View>

      {!collapsed && (
        <EnterBlock>
          {postcards.map(({ postcard, ordinal }) => (
            <SectionPostcard key={postcard.id} postcard={postcard} ordinal={ordinal} onPress={() => onOpenPostcard(postcard.id)} />
          ))}
        </EnterBlock>
      )}
    </View>
  );
}


function EnterBlock({ children }: { readonly children: React.ReactNode }) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: memoryMotion.rowEnterMs,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [memoryMotion.rowEnterScale, 1] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}


function MotionRow({
  exiting,
  entering,
  children,
}: {
  readonly exiting: boolean;
  readonly entering: boolean;
  readonly children: React.ReactNode;
}) {
  const presence = useRef(new Animated.Value(entering ? 0 : 1)).current;
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (exiting) {
      Animated.parallel([
        Animated.timing(presence, {
          toValue: 0,
          duration: memoryMotion.rowExitMs,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(lift, {
          toValue: memoryMotion.rowExitTravel,
          duration: memoryMotion.rowExitMs,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    lift.setValue(0);
    Animated.timing(presence, {
      toValue: 1,
      duration: memoryMotion.rowEnterMs,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [exiting, lift, presence]);

  return (
    <Animated.View
      pointerEvents={exiting ? 'none' : 'auto'}
      style={{
        opacity: presence,
        transform: [
          { translateY: lift },
          { scale: presence.interpolate({ inputRange: [0, 1], outputRange: [memoryMotion.rowEnterScale, 1] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}


function SectionPostcard({
  postcard,
  ordinal,
  onPress,
}: {
  readonly postcard: DiaryPostcardResponse;
  readonly ordinal: number;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.sectionPostcard}
      accessibilityRole="button"
      accessibilityLabel={postcard.caption ?? dayOrdinalLabel(ordinal)}
      onPress={onPress}
    >
      <Text style={styles.sectionPostcardDay}>{dayOrdinalLabel(ordinal)}</Text>
      <MediaThumb
        url={postcard.photos[0]?.url ?? null}
        style={styles.sectionPostcardPhoto}
        accessibilityLabel={dayOrdinalLabel(ordinal)}
        fallback={<View style={styles.fill} />}
      />
      {postcard.caption !== null && <Text style={styles.sectionPostcardCaption}>{postcard.caption}</Text>}
    </Pressable>
  );
}


const styles = StyleSheet.create({
  pane: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
  fill: {
    width: '100%',
    height: '100%',
    backgroundColor: memoryColors.wellDivider,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 48,
    paddingHorizontal: memoryMetrics.emptySidePadding,
    gap: 6,
  },
  emptyIcon: {
    width: memoryMetrics.emptyIcon,
    height: memoryMetrics.emptyIcon,
    borderRadius: memoryMetrics.emptyIcon / 2,
    backgroundColor: memoryColors.highlightWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    ...memoryTypography.cardTitle,
    color: memoryColors.title,
  },
  emptyBody: {
    ...memoryTypography.meta13,
    color: memoryColors.muted,
    textAlign: 'center',
  },
  looseCard: {
    borderWidth: 1,
    borderColor: memoryColors.divider,
    borderRadius: memoryMetrics.looseRadius,
    overflow: 'hidden',
    backgroundColor: memoryColors.card,
  },
  loosePhoto: {
    height: memoryMetrics.loosePhoto,
    backgroundColor: memoryColors.wellDivider,
  },
  photoPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingVertical: 5,
    paddingHorizontal: 9,
    backgroundColor: memoryColors.photoPill,
    borderRadius: 999,
  },
  photoPillInk: {
    ...memoryTypography.photoPill,
    color: memoryColors.white,
  },
  looseBody: {
    paddingVertical: memoryMetrics.looseBodyPaddingV,
    paddingHorizontal: memoryMetrics.looseBodyPaddingH,
    gap: 6,
  },
  looseCaptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  looseCaptionPress: {
    flex: 1,
  },
  looseCaption: {
    ...memoryTypography.caption,
    color: memoryColors.title,
  },
  kebab: {
    width: memoryMetrics.kebab + 6,
    height: memoryMetrics.kebab + 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -3,
    marginRight: -3,
  },
  looseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  looseMetaInk: {
    ...memoryTypography.cardMeta,
    color: memoryColors.muted,
  },
  section: {
    borderWidth: 1,
    borderColor: memoryColors.divider,
    borderRadius: memoryMetrics.looseRadius,
    overflow: 'hidden',
    backgroundColor: memoryColors.card,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: memoryMetrics.sectionPadding,
  },
  sectionIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  sectionThumb: {
    width: memoryMetrics.sectionThumb,
    height: memoryMetrics.sectionThumb,
    borderRadius: memoryMetrics.sectionThumbRadius,
    backgroundColor: memoryColors.wellDivider,
    flexShrink: 0,
  },
  sectionText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  sectionTitle: {
    ...memoryTypography.cardTitle,
    color: memoryColors.title,
  },
  sectionMeta: {
    ...memoryTypography.cardMeta,
    color: memoryColors.muted,
  },
  itineraryLink: {
    ...memoryTypography.cardMetaStrong,
    color: memoryColors.accent,
  },
  sectionControl: {
    width: memoryMetrics.chevronHit,
    height: memoryMetrics.chevronHit,
    borderRadius: memoryMetrics.chevronHit / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -7,
    flexShrink: 0,
  },
  sectionKebab: {
    marginHorizontal: -4,
  },
  sectionChevron: {
    marginRight: -8,
  },
  sectionPostcard: {
    borderTopWidth: 1,
    borderTopColor: memoryColors.divider,
    padding: memoryMetrics.sectionPadding,
    gap: 8,
  },
  sectionPostcardDay: {
    ...memoryTypography.cardMetaStrong,
    color: memoryColors.muted,
  },
  sectionPostcardPhoto: {
    height: memoryMetrics.sectionPostcardPhoto,
    borderRadius: memoryMetrics.sectionPostcardRadius,
    backgroundColor: memoryColors.wellDivider,
    overflow: 'hidden',
  },
  sectionPostcardCaption: {
    ...memoryTypography.caption,
    color: memoryColors.title,
  },
  pressed: {
    opacity: memoryMotion.pressOpacity,
  },
});
