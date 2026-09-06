import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable, usePressFeedback } from '../components/usePressFeedback';
import { MediaThumb } from '../media/MediaThumb';
import { memoryColors, memoryMetrics, memoryTypography } from '../theme/memoryTokens';
import type {
  DiaryPostcardResponse,
  DiarySectionResponse,
  DiarySectionsResponse,
} from '../types/api';
import {
  DIARY_TAB_EMPTY_BODY,
  DIARY_TAB_EMPTY_TITLE,
  NO_POSTCARDS_ON_THIS_DAY,
  VIEW_ITINERARY_LINK,
  dayOrdinalLabel,
  sectionMetaLine,
} from './memoryCopy';


interface MemoryDiaryTabProps {
  readonly sections: DiarySectionsResponse;
  readonly owned: boolean;
  readonly onOpenDiary: (diaryId: string) => void;
  readonly onOpenPostcard: (postcardId: string) => void;
  readonly onOpenItinerary: (itineraryId: string) => void;
  readonly onDiaryMenu?: (section: DiarySectionResponse) => void;
}


export function MemoryDiaryTab({
  sections,
  owned,
  onOpenDiary,
  onOpenPostcard,
  onOpenItinerary,
  onDiaryMenu,
}: MemoryDiaryTabProps) {
  const [collapsed, setCollapsed] = useState<readonly string[]>([]);

  if (sections.diaries.length === 0 && sections.loosePostcards.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{DIARY_TAB_EMPTY_TITLE}</Text>
        <Text style={styles.emptyBody}>{DIARY_TAB_EMPTY_BODY}</Text>
      </View>
    );
  }

  return (
    <View style={styles.pane}>
      {sections.loosePostcards.map((postcard) => (
        <LooseCard key={postcard.id} postcard={postcard} onPress={onOpenPostcard} />
      ))}

      {sections.diaries.map((section) => (
        <Section
          key={section.id}
          section={section}
          owned={owned}
          collapsed={collapsed.includes(section.id)}
          onToggle={() =>
            setCollapsed((current) =>
              current.includes(section.id)
                ? current.filter((id) => id !== section.id)
                : [...current, section.id],
            )
          }
          onOpenDiary={onOpenDiary}
          onOpenPostcard={onOpenPostcard}
          onOpenItinerary={onOpenItinerary}
          onDiaryMenu={onDiaryMenu}
        />
      ))}
    </View>
  );
}


function Section({
  section,
  owned,
  collapsed,
  onToggle,
  onOpenDiary,
  onOpenPostcard,
  onOpenItinerary,
  onDiaryMenu,
}: {
  readonly section: DiarySectionResponse;
  readonly owned: boolean;
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  readonly onOpenDiary: (diaryId: string) => void;
  readonly onOpenPostcard: (postcardId: string) => void;
  readonly onOpenItinerary: (itineraryId: string) => void;
  readonly onDiaryMenu?: (section: DiarySectionResponse) => void;
}) {
  const postcards = section.days.flatMap((day) =>
    day.postcards.map((postcard) => ({ postcard, ordinal: day.ordinal })),
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Pressable
          style={styles.sectionIdentity}
          accessibilityRole="button"
          accessibilityLabel={section.title}
          onPress={() => onOpenDiary(section.id)}
        >
          <MediaThumb
            url={section.cover?.thumbUrl ?? null}
            style={styles.sectionThumb}
            accessibilityLabel={section.title}
            fallback={<View style={styles.sectionThumbEmpty} />}
          />
          <View style={styles.sectionText}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {section.title}
            </Text>
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

        <View style={styles.sectionControls}>
          {owned && onDiaryMenu !== undefined && (
            <IconButton
              glyph="⋯"
              label={`${section.title} menu`}
              onPress={() => onDiaryMenu(section)}
            />
          )}
          <IconButton
            glyph={collapsed ? '⌄' : '⌃'}
            label={collapsed ? `Expand ${section.title}` : `Collapse ${section.title}`}
            onPress={onToggle}
          />
        </View>
      </View>

      {!collapsed &&
        (postcards.length === 0 ? (
          <Text style={styles.sectionEmpty}>{NO_POSTCARDS_ON_THIS_DAY}</Text>
        ) : (
          postcards.map(({ postcard, ordinal }) => (
            <SectionPostcard
              key={postcard.id}
              postcard={postcard}
              ordinal={ordinal}
              onPress={onOpenPostcard}
            />
          ))
        ))}
    </View>
  );
}


function SectionPostcard({
  postcard,
  ordinal,
  onPress,
}: {
  readonly postcard: DiaryPostcardResponse;
  readonly ordinal: number;
  readonly onPress: (postcardId: string) => void;
}) {
  return (
    <Pressable
      style={styles.postcardRow}
      accessibilityRole="button"
      accessibilityLabel={postcard.caption ?? dayOrdinalLabel(ordinal)}
      onPress={() => onPress(postcard.id)}
    >
      <MediaThumb
        url={postcard.photos[0]?.thumbUrl ?? null}
        style={styles.postcardThumb}
        accessibilityLabel={dayOrdinalLabel(ordinal)}
        fallback={<View style={styles.sectionThumbEmpty} />}
      />
      <View style={styles.postcardText}>
        <Text style={styles.postcardMeta}>{dayOrdinalLabel(ordinal)}</Text>
        {postcard.caption !== null && (
          <Text style={styles.postcardCaption} numberOfLines={3}>
            {postcard.caption}
          </Text>
        )}
      </View>
    </Pressable>
  );
}


function LooseCard({
  postcard,
  onPress,
}: {
  readonly postcard: DiaryPostcardResponse;
  readonly onPress: (postcardId: string) => void;
}) {
  return (
    <Pressable
      style={styles.looseCard}
      accessibilityRole="button"
      accessibilityLabel={postcard.caption ?? 'Postcard'}
      onPress={() => onPress(postcard.id)}
    >
      <MediaThumb
        url={postcard.photos[0]?.url ?? null}
        style={styles.loosePhoto}
        accessibilityLabel="Postcard"
        fallback={<View style={styles.sectionThumbEmpty} />}
      />
      {postcard.caption !== null && (
        <Text style={styles.looseCaption}>{postcard.caption}</Text>
      )}
      {postcard.place !== null && <Text style={styles.looseMeta}>{postcard.place}</Text>}
    </Pressable>
  );
}


function IconButton({
  glyph,
  label,
  onPress,
}: {
  readonly glyph: string;
  readonly label: string;
  readonly onPress: () => void;
}) {
  const press = usePressFeedback();

  return (
    <AnimatedPressable
      style={StyleSheet.flatten([styles.iconButton, press.style])}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Text style={styles.iconGlyph}>{glyph}</Text>
    </AnimatedPressable>
  );
}


const styles = StyleSheet.create({
  pane: {
    gap: memoryMetrics.sectionGap,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 6,
  },
  emptyTitle: {
    ...memoryTypography.dayHeading,
    color: memoryColors.title,
  },
  emptyBody: {
    ...memoryTypography.meta,
    color: memoryColors.muted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  looseCard: {
    backgroundColor: memoryColors.card,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.cardRadius,
    overflow: 'hidden',
  },
  loosePhoto: {
    width: '100%',
    height: 220,
  },
  looseCaption: {
    ...memoryTypography.body,
    color: memoryColors.title,
    paddingHorizontal: memoryMetrics.cardPadding,
    paddingTop: 12,
  },
  looseMeta: {
    ...memoryTypography.small,
    color: memoryColors.muted,
    paddingHorizontal: memoryMetrics.cardPadding,
    paddingTop: 4,
    paddingBottom: 12,
  },
  section: {
    backgroundColor: memoryColors.card,
    borderWidth: 1,
    borderColor: memoryColors.hairline,
    borderRadius: memoryMetrics.cardRadius,
    padding: memoryMetrics.cardPadding,
    gap: memoryMetrics.dayGap,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: memoryColors.tileWell,
  },
  sectionThumbEmpty: {
    width: '100%',
    height: '100%',
    backgroundColor: memoryColors.tileWell,
  },
  sectionText: {
    flex: 1,
  },
  sectionTitle: {
    ...memoryTypography.dayHeading,
    color: memoryColors.title,
  },
  sectionMeta: {
    ...memoryTypography.small,
    color: memoryColors.muted,
  },
  itineraryLink: {
    ...memoryTypography.small,
    color: memoryColors.accent,
    marginTop: 2,
  },
  sectionControls: {
    flexDirection: 'row',
    flexShrink: 0,
  },
  iconButton: {
    width: memoryMetrics.kebab + 8,
    height: memoryMetrics.kebab + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: {
    ...memoryTypography.chevron,
    color: memoryColors.body,
  },
  sectionEmpty: {
    ...memoryTypography.meta,
    color: memoryColors.faint,
  },
  postcardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  postcardThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: memoryColors.tileWell,
  },
  postcardText: {
    flex: 1,
  },
  postcardMeta: {
    ...memoryTypography.small,
    color: memoryColors.muted,
  },
  postcardCaption: {
    ...memoryTypography.body,
    color: memoryColors.title,
    marginTop: 2,
  },
});
