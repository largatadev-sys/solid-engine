import type { ItineraryResponse } from '../types/api';




export type ArchiveControl = {

  act: 'archive' | 'unarchive';
};


export function archiveControl(
  itinerary: Pick<ItineraryResponse, 'archived'>,
  isOwner: boolean,
): ArchiveControl | null {
  if (!isOwner) return null;
  return { act: itinerary.archived ? 'unarchive' : 'archive' };
}


export function canEditPlan(itinerary: Pick<ItineraryResponse, 'archived'>): boolean {
  return !itinerary.archived;
}

