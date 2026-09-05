import { isValidPin, type Pin } from './pinRules';


interface PinnedActivity {
  readonly pin?: Pin | null;
  readonly fields?: { readonly pin?: Pin | null };
}


interface PlannedDay {
  readonly activities: readonly PinnedActivity[];
}


export function lastPinIn(days: readonly PlannedDay[]): Pin | null {
  let found: Pin | null = null;

  for (const day of days) {
    for (const activity of day.activities) {
      const pin = activity.pin ?? activity.fields?.pin;
      if (isValidPin(pin)) found = pin;
    }
  }

  return found;
}


export function openingPinFor(destination: Pin | null | undefined, days: readonly PlannedDay[]): Pin | null {
  if (isValidPin(destination)) return destination;

  return lastPinIn(days);
}
