import type { IconName } from '../components/Icon';


export interface Option {
  readonly value: string;
  readonly label: string;
  readonly icon?: IconName;
}


export const EARN_GOAL = 'earn';


export const GOALS: readonly Option[] = [
  { value: 'discover', label: 'Discover trips', icon: 'compass' },
  { value: 'plan', label: 'Plan a trip', icon: 'map' },
  { value: 'plan_with_friends', label: 'Plan with friends', icon: 'users' },
  { value: 'share', label: 'Share an itinerary', icon: 'share' },
  { value: EARN_GOAL, label: 'Earn from my itineraries', icon: 'dollar' },
];


export const INTERESTS: readonly Option[] = [
  { value: 'budget', label: 'Budget' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'food_culture', label: 'Food & Culture' },
  { value: 'relaxation', label: 'Relaxation' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'family_travel', label: 'Family Travel' },
  { value: 'solo_travel', label: 'Solo Travel' },
  { value: 'group_travel', label: 'Group Travel' },
  { value: 'accessible_travel', label: 'Accessible Travel' },
];


export const MIN_INTERESTS = 3;


export function toggle(selected: readonly string[], value: string): string[] {
  return selected.includes(value)
    ? selected.filter((entry) => entry !== value)
    : [...selected, value];
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
