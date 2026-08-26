import { peopleCountLabel } from '../profile/publicProfileCopy';
import { tripCountLine } from './discoveryCopy';

export const PEOPLE_GROUP_CAP = 3;


export function combinedCountLine(people: number, trips: number): string {
  return `${peopleCountLabel(people)} · ${tripCountLine(trips)}`;
}


export function showsPeopleGroup(matched: number): boolean {
  return matched > 0;
}


export function cappedPeople<T>(people: readonly T[]): T[] {
  return people.slice(0, PEOPLE_GROUP_CAP);
}
