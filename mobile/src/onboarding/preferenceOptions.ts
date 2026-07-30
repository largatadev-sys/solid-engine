export interface Option {
  readonly value: string;
  readonly label: string;
  readonly blurb?: string;
}


export const EARN_GOAL = 'earn';


export const GOALS: readonly Option[] = [
  { value: 'discover', label: 'Discover trips', blurb: 'Browse itineraries other travelers have shared' },
  { value: 'plan', label: 'Plan a trip', blurb: 'Build a day-by-day plan of your own' },
  { value: 'plan_with_friends', label: 'Plan with friends', blurb: 'Invite people and plan together' },
  { value: 'share', label: 'Share an itinerary', blurb: 'Publish a trip for others to follow' },
  { value: EARN_GOAL, label: 'Earn from my itineraries', blurb: 'Tell us you are interested' },
];


export const INTERESTS: readonly Option[] = [
  { value: 'food', label: 'Food' },
  { value: 'beaches', label: 'Beaches' },
  { value: 'hiking', label: 'Hiking' },
  { value: 'diving', label: 'Diving' },
  { value: 'history', label: 'History' },
  { value: 'art', label: 'Art' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'nature', label: 'Nature' },
  { value: 'road_trips', label: 'Road trips' },
  { value: 'photography', label: 'Photography' },
  { value: 'festivals', label: 'Festivals' },
  { value: 'budget', label: 'Budget travel' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'family', label: 'Family travel' },
  { value: 'solo', label: 'Solo travel' },
  { value: 'wellness', label: 'Wellness' },
];


export const MIN_INTERESTS = 3;
export const MIN_GOALS = 1;


export function toggle(selected: readonly string[], value: string): string[] {
  return selected.includes(value)
    ? selected.filter((entry) => entry !== value)
    : [...selected, value];
}


export function hasEnoughGoals(selected: readonly string[]): boolean {
  return selected.length >= MIN_GOALS;
}


export function hasEnoughInterests(selected: readonly string[]): boolean {
  return selected.length >= MIN_INTERESTS;
}


export function interestsRemaining(selected: readonly string[]): number {
  const remaining = MIN_INTERESTS - selected.length;
  return remaining > 0 ? remaining : 0;
}


export function labelsFor(options: readonly Option[], selected: readonly string[]): string[] {
  return selected
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter((label): label is string => label !== undefined);
}
