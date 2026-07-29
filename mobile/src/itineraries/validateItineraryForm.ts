
export function validateItineraryForm(form: {
  title: string;
  destination: string;
  description: string;
  startDate: string;
  endDate: string;
  duration: string;
}): string | undefined {
  if (form.title.trim() === '') return 'A title is required.';
  if (form.title.trim().length > 120) return 'A title may be at most 120 characters.';
  if (form.destination.trim() === '') return 'At least one destination is required.';
  if (form.description.trim().length > 4000) return 'A description may be at most 4000 characters.';

  const duration = form.duration.trim();
  if (duration !== '') {
    if (!/^\d+$/.test(duration)) return 'Duration must be a whole number of days.';
    if (Number(duration) > 366) return 'A trip can be at most 366 days.';
  }

  const start = form.startDate.trim();
  const end = form.endDate.trim();
  if (start !== '' && !isCalendarDate(start)) return 'Start date must look like 2027-01-10.';
  if (end !== '' && !isCalendarDate(end)) return 'End date must look like 2027-01-10.';
  if (start !== '' && end !== '' && start > end) return 'A trip cannot end before it starts.';

  return undefined;
}


export function validateItineraryEdit(form: {
  title: string;
  destinations: string[];
  description: string;
  startDate: string;
  endDate: string;
}): string | undefined {
  if (form.title.trim() === '') return 'A title is required.';
  if (form.title.trim().length > 120) return 'A title may be at most 120 characters.';
  if (form.destinations.length === 0) return 'At least one destination is required.';
  if (form.description.trim().length > 4000) return 'A description may be at most 4000 characters.';
  if (form.startDate !== '' && form.endDate !== '' && form.startDate > form.endDate) {
    return 'A trip cannot end before it starts.';
  }
  return undefined;
}


function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}
