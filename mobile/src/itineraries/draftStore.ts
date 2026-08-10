import { useSyncExternalStore } from 'react';
import type { StagedPlan } from './stagedPlan';

type Entry = {
  base: StagedPlan;
  draft: StagedPlan;
};

const entries = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();

function announce(itineraryId: string): void {
  for (const listener of listeners.get(itineraryId) ?? []) listener();
}

export function openDraft(itineraryId: string, plan: StagedPlan): void {
  entries.set(itineraryId, { base: plan, draft: plan });
  announce(itineraryId);
}

export function closeDraft(itineraryId: string): void {
  entries.delete(itineraryId);
  announce(itineraryId);
}

export function draftOf(itineraryId: string): StagedPlan | undefined {
  return entries.get(itineraryId)?.draft;
}

export function baseOf(itineraryId: string): StagedPlan | undefined {
  return entries.get(itineraryId)?.base;
}

export function stageInto(itineraryId: string, op: (plan: StagedPlan) => StagedPlan): void {
  const entry = entries.get(itineraryId);
  if (entry === undefined) return;
  entries.set(itineraryId, { ...entry, draft: op(entry.draft) });
  announce(itineraryId);
}

export function useDraft(itineraryId: string): Entry | undefined {
  return useSyncExternalStore(
    (listener) => {
      const forId = listeners.get(itineraryId) ?? new Set();
      forId.add(listener);
      listeners.set(itineraryId, forId);
      return () => {
        forId.delete(listener);
      };
    },
    () => entries.get(itineraryId),
    () => entries.get(itineraryId),
  );
}
