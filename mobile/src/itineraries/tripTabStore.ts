import { useSyncExternalStore } from 'react';
import type { TripTab } from './tripTabs';


let picked: TripTab | null = null;

const listeners = new Set<() => void>();


function announce(): void {
  for (const listener of listeners) listener();
}


export function pickTab(tab: TripTab): void {
  picked = tab;
  announce();
}


export function pickedTab(): TripTab | null {
  return picked;
}


export function forgetPickedTab(): void {
  picked = null;
  announce();
}


export function usePickedTab(): TripTab | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    pickedTab,
    pickedTab,
  );
}
