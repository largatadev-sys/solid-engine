import { cleanRows } from './rowEditor';
import type { CreateItineraryRequest, ItineraryResponse, UpdateItineraryRequest } from '../types/api';


export type TripFormMode = 'create' | 'edit';


export type TripFormValues = {
  title: string;
  destinations: string[];
  description: string;
  standouts: string[];
  bestTimeOfYear: string;
  duration: string;
  startDate: string;
  endDate: string;
};


export type TripFormFields = {
  showsCover: boolean;
  destinationsAreMulti: boolean;
  standoutsReorder: boolean;
  showsDuration: boolean;
};


export type TripFormChrome = { headline: string; submitLabel: string };


const FIELDS: Record<TripFormMode, TripFormFields> = {
  create: {
    showsCover: true,
    destinationsAreMulti: true,
    standoutsReorder: false,
    showsDuration: true,
  },
  edit: {
    showsCover: true,
    destinationsAreMulti: true,
    standoutsReorder: true,
    showsDuration: false,
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
  if (cleanRows(form.destinations).length === 0) return 'At least one destination is required.';
  if (form.description.trim().length > 4000) return 'A description may be at most 4000 characters.';

  if (fields.showsDuration) {
    const duration = form.duration.trim();
    if (duration !== '') {
      if (!/^\d+$/.test(duration)) return 'Duration must be a whole number of days.';
      if (Number(duration) > 366) return 'A trip can be at most 366 days.';
    }
  }

  if (mode === 'edit') {
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
    destinations: cleanRows(form.destinations),
    ...(form.description.trim() !== '' ? { description: form.description.trim() } : {}),
    ...(duration !== '' ? { durationDays: Number(duration) } : {}),
    ...(form.bestTimeOfYear.trim() !== '' ? { bestTimeOfYear: form.bestTimeOfYear.trim() } : {}),
    ...(standouts.length > 0 ? { standouts } : {}),
  };
}


export function updateRequestFrom(form: TripFormValues): UpdateItineraryRequest {
  return {
    title: form.title.trim(),
    destinations: cleanRows(form.destinations),
    ...(form.description.trim() !== '' ? { description: form.description.trim() } : {}),
    standouts: cleanRows(form.standouts),
    bestTimeOfYear: form.bestTimeOfYear.trim(),
    ...(form.startDate !== '' ? { startDate: form.startDate } : {}),
    ...(form.endDate !== '' ? { endDate: form.endDate } : {}),
  };
}


export function tripFormValuesFrom(itinerary: ItineraryResponse): TripFormValues {
  return {
    title: itinerary.title,
    destinations: itinerary.destinations.length > 0 ? [...itinerary.destinations] : [''],
    description: itinerary.description ?? '',
    standouts: itinerary.standouts ?? [],
    bestTimeOfYear: itinerary.bestTimeOfYear ?? '',
    duration: '',
    startDate: itinerary.startDate ?? '',
    endDate: itinerary.endDate ?? '',
  };
}


export const EMPTY_TRIP_FORM: TripFormValues = {
  title: '',
  destinations: [''],
  description: '',
  standouts: [''],
  bestTimeOfYear: '',
  duration: '',
  startDate: '',
  endDate: '',
};


function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}
