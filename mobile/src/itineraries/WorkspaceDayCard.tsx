import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from '../components/Icon';
import {
  diaryTypography,
  workspaceCardShadow,
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
  workspaceTypography,
} from '../theme/workspaceTokens';
import type { ActivityResponse, DayResponse } from '../types/api';
import { dayHeading } from './dayHeading';
import { dayPrefix } from './dayTitle';
import { activityMetaLine } from './formatActivityCost';
import { webStyle } from './webStyle';
import type { WorkspaceAffordances } from './workspaceControls';


interface WorkspaceDayCardProps {
  readonly day: DayResponse;
  readonly expanded: boolean;
  readonly affordances: WorkspaceAffordances;
  readonly onToggle: () => void;
  readonly onAddActivity?: () => void;
  readonly onEditActivity?: (activity: ActivityResponse) => void;
  readonly onDeleteActivity?: (activity: ActivityResponse) => void;
  readonly onDeleteDay?: () => void;
  readonly onRenameDay?: () => void;
  readonly titleSlot?: React.ReactNode;
  readonly activitySlot?: React.ReactNode;
  readonly diaryLinkFor?: (activity: ActivityResponse) => DiaryLink | null;
}


export function WorkspaceDayCard({
  day,
  expanded,
  affordances,
  onToggle,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onDeleteDay,
  onRenameDay,
  titleSlot,
  activitySlot,
  diaryLinkFor,
}: WorkspaceDayCardProps) {
  const heading = dayHeading(day);

  const reveal = useSharedValue(expanded ? 1 : 0);
  const contentHeight = useSharedValue(0);

  useEffect(() => {
    reveal.value = withTiming(expanded ? 1 : 0, {
      duration: EXPAND_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, reveal]);

  const bodyStyle = useAnimatedStyle(() => ({
    height: reveal.value * contentHeight.value,
  }));

  return (
    <View style={styles.card}>
      {expanded ? (
        <View style={styles.headerRow}>
          {titleSlot ?? <Text style={styles.cardTitle}>{heading}</Text>}
          <View style={styles.titleSpacer} />
          {affordances.showsDayRename && onRenameDay !== undefined ? (
            <Pressable
              onPress={onRenameDay}
              accessibilityRole="button"
              accessibilityLabel={`Rename ${dayPrefix(day)}`}
              hitSlop={8}
            >
              <Icon name="pencilSquare" size={16} color={workspaceColors.accent} />
            </Pressable>
          ) : null}
          {affordances.showsDayDelete && onDeleteDay !== undefined ? (
            <Pressable
              onPress={onDeleteDay}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${heading}`}
              hitSlop={8}
            >
              <Icon name="trash" size={16} color={workspaceColors.accent} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: true }}
            accessibilityLabel={`${heading}, collapse`}
            hitSlop={8}
          >
            <Chevron expanded />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.headerRow, pressed && styles.pressed]}
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: false }}
          accessibilityLabel={`${heading}, expand`}
        >
          <Text style={styles.stubTitle} numberOfLines={1}>
            {heading}
          </Text>
          <View style={styles.titleSpacer} />
          <Chevron expanded={false} />
        </Pressable>
      )}

      <Animated.View
        style={[styles.body, bodyStyle]}
        pointerEvents={expanded ? 'auto' : 'none'}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
      >
        <View
          style={styles.bodyContent}
          onLayout={(event) => {
            contentHeight.value = event.nativeEvent.layout.height;
          }}
        >
          {day.activities.length > 0 || affordances.showsActivityEditing ? (
            <View style={styles.divider} />
          ) : null}

          {day.activities.length === 0 && !affordances.showsActivityEditing ? (
            <Text style={styles.emptyPeek}>Nothing planned for this day yet.</Text>
          ) : (
            activitySlot ??
            day.activities.map((activity, index) => (
              <Animated.View
                key={activity.id}
                entering={FadeIn.duration(ROW_ENTRY_MS).delay(index * ROW_STAGGER_MS)}
              >
                <ActivityRow
                  activity={activity}
                  affordances={affordances}
                  onEdit={onEditActivity}
                  onDelete={onDeleteActivity}
                  diaryLink={diaryLinkFor?.(activity) ?? null}
                />
              </Animated.View>
            ))
          )}

          {affordances.showsActivityEditing && onAddActivity !== undefined ? (
            <Pressable
              style={({ pressed }) => [styles.addActivity, pressed && styles.addActivityPressed]}
              onPress={onAddActivity}
              accessibilityRole="button"
              accessibilityLabel={`Add an activity to ${heading}`}
            >
              <Text style={styles.addActivityLabel} numberOfLines={1}>
                Add Activity
              </Text>
              <Icon name="plus" size={16} color={workspaceColors.accent} />
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}


function Chevron({ expanded }: { expanded: boolean }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(expanded ? '180deg' : '0deg', { duration: CHEVRON_MS }) }],
  }));

  return (
    <Animated.View style={style}>
      <Icon name="chevronDown" size={18} color={workspaceColors.muted} />
    </Animated.View>
  );
}


export interface DiaryLink {
  readonly label: string;
  readonly added: boolean;
  readonly onPress: () => void;
}


interface ActivityRowProps {
  readonly activity: ActivityResponse;
  readonly affordances: WorkspaceAffordances;
  readonly onEdit?: (activity: ActivityResponse) => void;
  readonly onDelete?: (activity: ActivityResponse) => void;
  readonly diaryLink?: DiaryLink | null;
  readonly grabHandlers?: Record<string, unknown>;
  readonly accessibilityActions?: ReadonlyArray<{ name: string; label: string }>;
  readonly onAccessibilityAction?: (actionName: string) => void;
}


export function ActivityRow({
  activity,
  affordances,
  onEdit,
  onDelete,
  diaryLink,
  grabHandlers,
  accessibilityActions,
  onAccessibilityAction,
}: ActivityRowProps) {
  const meta = activityMetaLine(activity.timeOfDay, null, null, activity.place);

  return (
    <View
      style={styles.activityRow}
      accessibilityActions={accessibilityActions === undefined ? undefined : [...accessibilityActions]}
      onAccessibilityAction={
        onAccessibilityAction === undefined
          ? undefined
          : (event) => onAccessibilityAction(event.nativeEvent.actionName)
      }
    >
      {affordances.showsDragHandles && grabHandlers !== undefined ? (
        <View
          {...grabHandlers}
          style={[styles.grip, GRAB_CURSOR]}
          accessibilityLabel={`Drag ${activity.title} to reorder`}
        >
          <Icon name="grip" size={16} color={workspaceColors.muted} />
        </View>
      ) : affordances.showsDragHandles ? (
        <Icon name="grip" size={16} color={workspaceColors.muted} />
      ) : null}

      <View style={styles.activityText}>
        <Text style={styles.activityName}>{activity.title}</Text>
        {meta !== '' ? <Text style={styles.activityTime}>{meta}</Text> : null}
      </View>

      {affordances.showsActivityEditing ? (
        <View style={styles.activityActions}>
          <Pressable
            onPress={() => onEdit?.(activity)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${activity.title}`}
            hitSlop={8}
          >
            <Icon name="pencilSquare" size={16} color={workspaceColors.accent} />
          </Pressable>
          <Pressable
            onPress={() => onDelete?.(activity)}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${activity.title}`}
            hitSlop={8}
          >
            <Icon name="trash" size={16} color={workspaceColors.accent} />
          </Pressable>
        </View>
      ) : null}

      {diaryLink !== null && diaryLink !== undefined ? (
        <Pressable
          style={styles.diaryLinkTap}
          onPress={diaryLink.onPress}
          accessibilityRole="button"
          accessibilityLabel={`${diaryLink.label}: ${activity.title}`}
          hitSlop={8}
        >
          <Text
            style={[styles.diaryLink, diaryLink.added && styles.diaryLinkAdded]}
            numberOfLines={1}
          >
            {diaryLink.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}


const GRAB_CURSOR = webStyle({ cursor: 'grab', userSelect: 'none', touchAction: 'none' });

const CHEVRON_MS = 200;

const EXPAND_MS = 240;

const ROW_ENTRY_MS = 180;

const ROW_STAGGER_MS = 40;

const styles = StyleSheet.create({
  pressed: {
    backgroundColor: workspaceColors.pressed,
  },
  addActivityPressed: {
    backgroundColor: workspaceColors.accentWash,
  },
  stubTitle: {
    ...workspaceTypography.stubTitle,
    color: workspaceColors.title,
    flexShrink: 1,
  },
  card: {
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: workspaceRadii.card,
    backgroundColor: workspaceColors.surface,
    ...workspaceCardShadow,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: workspaceRadii.card,
  },
  body: {
    overflow: 'hidden',
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  titleSpacer: {
    flex: 1,
  },
  cardTitle: {
    ...workspaceTypography.dayTitle,
    color: workspaceColors.title,
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: workspaceColors.hairline,
  },
  emptyPeek: {
    ...workspaceTypography.activityTime,
    color: workspaceColors.muted,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: workspaceRadii.card,
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    minHeight: workspaceMetrics.activityRowHeight,
  },
  grip: {
    padding: 4,
    margin: -4,
  },
  activityText: {
    flex: 1,
    gap: 2,
  },
  activityName: {
    ...workspaceTypography.activityName,
    color: workspaceColors.title,
  },
  activityTime: {
    ...workspaceTypography.activityTime,
    color: workspaceColors.muted,
  },
  activityActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  diaryLinkTap: {
    flexShrink: 0,
  },
  diaryLink: {
    ...diaryTypography.link,
    color: workspaceColors.accent,
  },
  diaryLinkAdded: {
    color: workspaceColors.captured,
  },
  addActivity: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: workspaceColors.accent,
    borderRadius: workspaceRadii.card,
    paddingVertical: 12,
  },
  addActivityLabel: {
    ...workspaceTypography.ctaOutlined,
    color: workspaceColors.accent,
    flexShrink: 0,
  },
});
