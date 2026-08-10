import type {
  ActivityRequest,
  ActivityResponse,
  DayResponse,
  ItineraryResponse,
  SavePlanRequest,
} from '../types/api';

export type StagedActivity = {
  id: string;
  serverId: string | null;
  fields: ActivityRequest;
};

export type StagedDay = {
  id: string;
  serverId: string | null;
  title: string | null;
  activities: StagedActivity[];
};

export type StagedPlan = {
  basePlanVersion: number;
  days: StagedDay[];
};

const STAGED_PREFIX = 'staged:';

let minted = 0;

export function stagedId(): string {
  minted += 1;
  return `${STAGED_PREFIX}${minted}`;
}

export function isStaged(id: string): boolean {
  return id.startsWith(STAGED_PREFIX);
}

export function planFrom(itinerary: ItineraryResponse): StagedPlan {
  return {
    basePlanVersion: itinerary.planVersion ?? 0,
    days: itinerary.days.map(dayFrom),
  };
}

export function appendDay(plan: StagedPlan): StagedPlan {
  return {
    ...plan,
    days: [...plan.days, { id: stagedId(), serverId: null, title: null, activities: [] }],
  };
}

export function renameDay(plan: StagedPlan, dayId: string, title: string | null): StagedPlan {
  const cleaned = title === null || title.trim() === '' ? null : title.trim();
  return mapDays(plan, (day) => (day.id === dayId ? { ...day, title: cleaned } : day));
}

export function deleteDay(plan: StagedPlan, dayId: string): StagedPlan {
  return { ...plan, days: plan.days.filter((day) => day.id !== dayId) };
}

export function createActivity(plan: StagedPlan, dayId: string, fields: ActivityRequest): StagedPlan {
  return mapDays(plan, (day) =>
    day.id === dayId
      ? { ...day, activities: [...day.activities, { id: stagedId(), serverId: null, fields }] }
      : day,
  );
}

export function editActivity(plan: StagedPlan, activityId: string, fields: ActivityRequest): StagedPlan {
  return mapDays(plan, (day) => ({
    ...day,
    activities: day.activities.map((activity) =>
      activity.id === activityId ? { ...activity, fields } : activity,
    ),
  }));
}

export function deleteActivity(plan: StagedPlan, activityId: string): StagedPlan {
  return mapDays(plan, (day) => ({
    ...day,
    activities: day.activities.filter((activity) => activity.id !== activityId),
  }));
}

export function reorderActivities(plan: StagedPlan, dayId: string, activityIds: string[]): StagedPlan {
  return mapDays(plan, (day) => {
    if (day.id !== dayId) return day;
    const byId = new Map(day.activities.map((activity) => [activity.id, activity]));
    if (activityIds.length !== day.activities.length || activityIds.some((id) => !byId.has(id))) {
      return day;
    }
    return { ...day, activities: activityIds.map((id) => byId.get(id) as StagedActivity) };
  });
}

export function activityIn(plan: StagedPlan, activityId: string): StagedActivity | undefined {
  for (const day of plan.days) {
    const found = day.activities.find((activity) => activity.id === activityId);
    if (found !== undefined) return found;
  }
  return undefined;
}

export function isDirty(plan: StagedPlan, base: StagedPlan): boolean {
  return JSON.stringify(saveRequestFor(plan)) !== JSON.stringify(saveRequestFor(base));
}

export function saveRequestFor(plan: StagedPlan): SavePlanRequest {
  return {
    basePlanVersion: plan.basePlanVersion,
    days: plan.days.map((day) => ({
      id: day.serverId,
      title: day.title,
      activities: day.activities.map((activity) => ({ id: activity.serverId, fields: activity.fields })),
    })),
  };
}

function mapDays(plan: StagedPlan, mapper: (day: StagedDay) => StagedDay): StagedPlan {
  return { ...plan, days: plan.days.map(mapper) };
}

function dayFrom(day: DayResponse): StagedDay {
  return {
    id: day.id,
    serverId: day.id,
    title: day.title,
    activities: day.activities.map(activityFrom),
  };
}

function activityFrom(activity: ActivityResponse): StagedActivity {
  return {
    id: activity.id,
    serverId: activity.id,
    fields: {
      title: activity.title,
      timeOfDay: activity.timeOfDay ?? undefined,
      costAmount: activity.costAmount ?? undefined,
      costCurrency: activity.costCurrency ?? undefined,
      place: activity.place ?? undefined,
      description: activity.description ?? undefined,
      notes: activity.notes ?? undefined,
      externalUrl: activity.externalUrl ?? undefined,
      bookingPurpose: activity.bookingPurpose ?? undefined,
      bookingProvider: activity.bookingProvider ?? undefined,
      bookingPriceAmount: activity.bookingPriceAmount ?? undefined,
      bookingPriceCurrency: activity.bookingPriceCurrency ?? undefined,
    },
  };
}
