import { View } from 'react-native';
import type { ActivityResponse } from '../types/api';
import { ActivityRow } from './WorkspaceDayCard';
import type { WorkspaceAffordances } from './workspaceControls';


interface DraggableActivityListProps {
  readonly activities: ActivityResponse[];
  readonly affordances: WorkspaceAffordances;
  readonly onEdit: (activity: ActivityResponse) => void;
  readonly onDelete: (activity: ActivityResponse) => void;
  readonly onDrop: (activityId: string, toIndex: number) => void;
  readonly onNudge: (activityId: string, direction: 'up' | 'down') => void;
}


export function DraggableActivityList({
  activities,
  affordances,
  onEdit,
  onDelete,
  onNudge,
}: DraggableActivityListProps) {
  return (
    <View>
      {activities.map((activity, index) => (
        <ActivityRow
          key={activity.id}
          activity={activity}
          affordances={affordances}
          onEdit={onEdit}
          onDelete={onDelete}
          nudge={{
            canMoveUp: index > 0,
            canMoveDown: index < activities.length - 1,
            onMoveUp: () => onNudge(activity.id, 'up'),
            onMoveDown: () => onNudge(activity.id, 'down'),
          }}
        />
      ))}
    </View>
  );
}
