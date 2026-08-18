import type { ItineraryResponse } from '../types/api';
import { isEditable } from './publishControls';


export type WorkspaceMenuItem = 'edit-details' | 'view-published' | 'unpublish';


export const WORKSPACE_MENU_LABELS: Readonly<Record<WorkspaceMenuItem, string>> = {
  'edit-details': 'Edit details',
  'view-published': 'View published',
  unpublish: 'Unpublish',
};


export const TRIP_SETTINGS_LABEL = 'Trip settings';


export type MenuSubject = Pick<ItineraryResponse, 'published' | 'archived'>;


export function workspaceMenuItems(itinerary: MenuSubject, isOwner: boolean): WorkspaceMenuItem[] {
  const items: WorkspaceMenuItem[] = [];

  if (isOwner && isEditable(itinerary)) items.push('edit-details');
  if (itinerary.published) items.push('view-published');
  if (isOwner && itinerary.published && !itinerary.archived) items.push('unpublish');

  return items;
}


export const COG_IS_LIVE = false;


export function showsSettingsCog(itinerary: MenuSubject, isOwner: boolean): boolean {
  return COG_IS_LIVE && workspaceMenuItems(itinerary, isOwner).length > 0;
}
