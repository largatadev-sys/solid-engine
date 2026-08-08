import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from '../components/Icon';
import {
  workspaceCardShadow,
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
  workspaceTypography,
} from '../theme/workspaceTokens';
import type { ActivityResponse, DayResponse } from '../types/api';
import { dayHeading } from './dayHeading';
import { formatTimeOfDay } from './formatActivityCost';
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
  readonly titleSlot?: React.ReactNode;
  readonly activitySlot?: React.ReactNode;
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
  titleSlot,
  activitySlot,
}: WorkspaceDayCardProps) {
  const heading = dayHeading(day);

  if (!expanded) {
    return (
      <Animated.View layout={CARD_TRANSITION}>
        <Pressable
          style={({ pressed }) => [styles.stub, pressed && styles.pressed]}
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: false }}
          accessibilityLabel={`${heading}, expand`}
        >
          <Text style={styles.stubTitle} numberOfLines={1}>
            {heading}
          </Text>
          <Chevron expanded={false} />
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={styles.card} layout={CARD_TRANSITION}>
      <View style={styles.titleRow}>
        {titleSlot ?? <Text style={styles.cardTitle}>{heading}</Text>}
        <View style={styles.titleSpacer} />
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
    </Animated.View>
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


export type RowNudge = {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
};


interface ActivityRowProps {
  readonly activity: ActivityResponse;
  readonly affordances: WorkspaceAffordances;
  readonly onEdit?: (activity: ActivityResponse) => void;
  readonly onDelete?: (activity: ActivityResponse) => void;
  readonly nudge?: RowNudge;
  readonly grabHandlers?: Record<string, unknown>;
  readonly accessibilityActions?: ReadonlyArray<{ name: string; label: string }>;
  readonly onAccessibilityAction?: (actionName: string) => void;
}


export function ActivityRow({
  activity,
  affordances,
  onEdit,
  onDelete,
  nudge,
  grabHandlers,
  accessibilityActions,
  onAccessibilityAction,
}: ActivityRowProps) {
  const time = formatTimeOfDay(activity.timeOfDay);

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
      ) : affordances.showsDragHandles && nudge === undefined ? (
        <Icon name="grip" size={16} color={workspaceColors.muted} />
      ) : null}

      {nudge !== undefined ? (
        <View style={styles.nudgeColumn}>
          <Pressable
            onPress={nudge.onMoveUp}
            disabled={!nudge.canMoveUp}
            accessibilityRole="button"
            accessibilityLabel={`Move ${activity.title} up`}
            accessibilityState={{ disabled: !nudge.canMoveUp }}
            hitSlop={4}
          >
            <Icon
              name="chevronUp"
              size={14}
              color={nudge.canMoveUp ? workspaceColors.muted : workspaceColors.hairline}
            />
          </Pressable>
          <Pressable
            onPress={nudge.onMoveDown}
            disabled={!nudge.canMoveDown}
            accessibilityRole="button"
            accessibilityLabel={`Move ${activity.title} down`}
            accessibilityState={{ disabled: !nudge.canMoveDown }}
            hitSlop={4}
          >
            <Icon
              name="chevronDown"
              size={14}
              color={nudge.canMoveDown ? workspaceColors.muted : workspaceColors.hairline}
            />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.activityText}>
        <Text style={styles.activityName}>{activity.title}</Text>
        {time !== undefined ? <Text style={styles.activityTime}>{time}</Text> : null}
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
    </View>
  );
}


const GRAB_CURSOR = webStyle({ cursor: 'grab', userSelect: 'none', touchAction: 'none' });

const CHEVRON_MS = 200;

const CARD_TRANSITION = LinearTransition.duration(240);

const ROW_ENTRY_MS = 180;

const ROW_STAGGER_MS = 40;

const styles = StyleSheet.create({
  pressed: {
    backgroundColor: workspaceColors.pressed,
  },
  addActivityPressed: {
    backgroundColor: workspaceColors.accentWash,
  },
  stub: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: workspaceRadii.card,
    padding: 16,
    backgroundColor: workspaceColors.surface,
    ...workspaceCardShadow,
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
    padding: 16,
    gap: 12,
    backgroundColor: workspaceColors.surface,
    ...workspaceCardShadow,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  nudgeColumn: {
    gap: 2,
    alignItems: 'center',
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
