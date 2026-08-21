import { clampToCap } from './chatThread';

const drafts = new Map<string, string>();


export function readDraft(itineraryId: string): string {
  return drafts.get(itineraryId) ?? '';
}


export function writeDraft(itineraryId: string, draft: string): string {
  const capped = clampToCap(draft);
  if (capped === '') {
    drafts.delete(itineraryId);
    return '';
  }
  drafts.set(itineraryId, capped);
  return capped;
}


export function clearDraft(itineraryId: string): void {
  drafts.delete(itineraryId);
}


export function forgetEveryDraft(): void {
  drafts.clear();
}
