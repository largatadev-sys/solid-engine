import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import {
  workspaceColors,
  workspaceMetrics,
  workspaceRadii,
  workspaceTypography,
} from '../theme/workspaceTokens';
import type { ActivityResponse, DayResponse } from '../types/api';
import { dayHeading } from './dayHeading';
import { formatTimeOfDay } from './formatActivityCost';
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
      <Pressable
        style={styles.stub}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: false }}
        accessibilityLabel={`${heading}, expand`}
      >
        <Text style={styles.stubTitle}>{heading}</Text>
        <Icon name="chevronDown" size={18} color={workspaceColors.muted} />
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        {titleSlot ?? <Text style={styles.cardTitle}>{heading}</Text>}
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: true }}
          accessibilityLabel={`${heading}, collapse`}
          hitSlop={8}
        >
          <Icon name="minus" size={18} color={workspaceColors.muted} />
        </Pressable>
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
      </View>

      <View style={styles.divider} />

      {activitySlot ??
        day.activities.map((activity) => (
          <ActivityRow
            key={activity.id}
            activity={activity}
            affordances={affordances}
            onEdit={onEditActivity}
            onDelete={onDeleteActivity}
          />
        ))}

      {affordances.showsActivityEditing && onAddActivity !== undefined ? (
        <Pressable
          style={styles.addActivity}
          onPress={onAddActivity}
          accessibilityRole="button"
          accessibilityLabel={`Add an activity to ${heading}`}
        >
          <Text style={styles.addActivityLabel}>Add Activity</Text>
          <Icon name="plus" size={16} color={workspaceColors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}


interface ActivityRowProps {
  readonly activity: ActivityResponse;
  readonly affordances: WorkspaceAffordances;
  readonly onEdit?: (activity: ActivityResponse) => void;
  readonly onDelete?: (activity: ActivityResponse) => void;
}


export function ActivityRow({ activity, affordances, onEdit, onDelete }: ActivityRowProps) {
  const time = formatTimeOfDay(activity.timeOfDay);

  return (
    <View style={styles.activityRow}>
      {affordances.showsDragHandles ? (
        <Icon name="grip" size={16} color={workspaceColors.muted} />
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


const styles = StyleSheet.create({
  stub: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: workspaceColors.hairline,
    borderRadius: workspaceRadii.card,
    padding: 16,
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
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: workspaceRadii.card,
    minHeight: workspaceMetrics.activityRowHeight,
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
  },
});
