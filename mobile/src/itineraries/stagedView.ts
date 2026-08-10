import type { ActivityResponse, DayResponse } from '../types/api';
import type { StagedActivity, StagedDay, StagedPlan } from './stagedPlan';


export function stagedDays(plan: StagedPlan): DayResponse[] {
  return plan.days.map((day, index) => ({
    id: day.id,
    ordinal: index + 1,
    title: day.title,
    activities: day.activities.map((activity, sortOrder) => shownActivity(activity, sortOrder)),
  }));
}


function shownActivity(activity: StagedActivity, sortOrder: number): ActivityResponse {
  const fields = activity.fields;
  return {
    id: activity.id,
    sortOrder,
    title: fields.title,
    timeOfDay: fields.timeOfDay ?? null,
    costAmount: fields.costAmount ?? null,
    costCurrency: fields.costCurrency ?? null,
    place: fields.place ?? null,
    description: fields.description ?? null,
    notes: fields.notes ?? null,
    externalUrl: fields.externalUrl ?? null,
    bookingPurpose: fields.bookingPurpose ?? null,
    bookingProvider: fields.bookingProvider ?? null,
    bookingPriceAmount: fields.bookingPriceAmount ?? null,
    bookingPriceCurrency: fields.bookingPriceCurrency ?? null,
    lastEditedBy: '',
    lastEditedAt: '',
    photos: [],
  };
}


export function dayHolding(plan: StagedPlan, activityId: string): StagedDay | undefined {
  return plan.days.find((day) => day.activities.some((activity) => activity.id === activityId));
}
