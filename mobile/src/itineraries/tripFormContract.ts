import { cleanRows } from './rowEditor';
import { DEFAULT_TRIP_CURRENCY } from './currencies';
import type { CreateItineraryRequest, ItineraryResponse, Pin, UpdateItineraryRequest } from '../types/api';


export type TripFormMode = 'create' | 'edit';


export type TripFormValues = {
  title: string;
  destination: string;
  currency: string;
  description: string;
  standouts: string[];
  bestTimeOfYear: string;
  duration: string;
  startDate: string;
  endDate: string;
  pin?: Pin | null;
};


export type TripFormFields = {
  showsCover: boolean;
  standoutsReorder: boolean;
  showsDuration: boolean;
  showsDates: boolean;
  showsCurrency: boolean;
};


export const DURATION_CHOICES = Array.from({ length: 30 }, (_, i) => i + 1);


export const STANDOUTS_HINT = 'Shown on your published page.';


export type TripFormChrome = { headline: string; submitLabel: string };


export const DATE_FIELDS_ARE_LIVE = false;


const FIELDS: Record<TripFormMode, TripFormFields> = {
  create: {
    showsCover: true,
    standoutsReorder: false,
    showsDuration: true,
    showsDates: false,
    showsCurrency: false,
  },
  edit: {
    showsCover: true,
    standoutsReorder: true,
    showsDuration: false,
    showsDates: DATE_FIELDS_ARE_LIVE,
    showsCurrency: true,
  },
};


const CHROME: Record<TripFormMode, TripFormChrome> = {
  create: { headline: 'Plan a Trip', submitLabel: 'Create Trip' },
  edit: { headline: 'Edit Trip', submitLabel: 'Save' },
};


export function tripFormFields(mode: TripFormMode): TripFormFields {
  return FIELDS[mode];
}


export function tripFormChrome(mode: TripFormMode): TripFormChrome {
  return CHROME[mode];
}


export function validateTripForm(mode: TripFormMode, form: TripFormValues): string | undefined {
  const fields = FIELDS[mode];

  if (form.title.trim() === '') return 'A title is required.';
  if (form.title.trim().length > 120) return 'A title may be at most 120 characters.';
  if (form.destination.trim() === '') return 'A destination is required.';
  if (form.destination.trim().length > 120) return 'A destination may be at most 120 characters.';
  if (form.description.trim().length > 4000) return 'A description may be at most 4000 characters.';

  if (fields.showsDuration) {
    const duration = form.duration.trim();
    if (duration !== '') {
      if (!/^\d+$/.test(duration)) return 'Duration must be a whole number of days.';
      if (Number(duration) > 366) return 'A trip can be at most 366 days.';
    }
  }

  if (fields.showsDates) {
    if (form.startDate !== '' && !isCalendarDate(form.startDate)) {
      return 'Start date must look like 2027-01-10.';
    }
    if (form.endDate !== '' && !isCalendarDate(form.endDate)) {
      return 'End date must look like 2027-01-10.';
    }
    if (form.startDate !== '' && form.endDate !== '' && form.startDate > form.endDate) {
      return 'A trip cannot end before it starts.';
    }
  }

  return undefined;
}


export function createRequestFrom(form: TripFormValues): CreateItineraryRequest {
  const standouts = cleanRows(form.standouts);
  const duration = form.duration.trim();

  return {
    title: form.title.trim(),
    destination: form.destination.trim(),
    ...(form.description.trim() !== '' ? { description: form.description.trim() } : {}),
    ...(duration !== '' ? { durationDays: Number(duration) } : {}),
    ...(form.bestTimeOfYear.trim() !== '' ? { bestTimeOfYear: form.bestTimeOfYear.trim() } : {}),
    ...(standouts.length > 0 ? { standouts } : {}),
    ...(form.pin == null ? {} : { pin: form.pin }),
  };
}


export function updateRequestFrom(form: TripFormValues): UpdateItineraryRequest {
  return {
    title: form.title.trim(),
    destination: form.destination.trim(),
    currency: form.currency,
    description: blankToNull(form.description),
    standouts: cleanRows(form.standouts),
    bestTimeOfYear: blankToNull(form.bestTimeOfYear),
    pin: form.pin ?? null,
    ...(DATE_FIELDS_ARE_LIVE
      ? { startDate: blankToNull(form.startDate), endDate: blankToNull(form.endDate) }
      : {}),
  };
}


export function tripFormValuesFrom(itinerary: ItineraryResponse): TripFormValues {
  return {
    title: itinerary.title,
    destination: itinerary.destination,
    currency: itinerary.currency ?? DEFAULT_TRIP_CURRENCY,
    description: itinerary.description ?? '',
    standouts: itinerary.standouts ?? [],
    bestTimeOfYear: itinerary.bestTimeOfYear ?? '',
    duration: '',
    pin: itinerary.pin ?? null,
    startDate: itinerary.startDate ?? '',
    endDate: itinerary.endDate ?? '',
  };
}


export function currencyChangeNeedsConfirming(
  before: TripFormValues,
  after: TripFormValues,
  pricedActivityCount: number,
): boolean {
  return after.currency !== before.currency && pricedActivityCount > 0;
}


export const DEFAULT_DURATION = '1';


export const EMPTY_TRIP_FORM: TripFormValues = {
  title: '',
  destination: '',
  currency: DEFAULT_TRIP_CURRENCY,
  description: '',
  standouts: [''],
  bestTimeOfYear: '',
  duration: DEFAULT_DURATION,
  startDate: '',
  endDate: '',
  pin: null,
};


function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}


function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}


export function pricedActivityCount(itinerary: {
  days: Array<{ activities: Array<{ costAmount: string | null }> }>;
}): number {
  return itinerary.days.reduce(
    (running, day) =>
      running + day.activities.filter((activity) => activity.costAmount !== null).length,
    0,
  );
}
