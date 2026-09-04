import type { ProfileVisibility, ViewerRelation } from '../types/api';


export interface ProfileProjection {
  readonly locked: boolean;
  readonly showsTabs: boolean;
  readonly showsShowcase: boolean;
  readonly showsNotice: boolean;
  readonly followCellsOpen: boolean;
}


const OPEN: ProfileProjection = {
  locked: false,
  showsTabs: true,
  showsShowcase: true,
  showsNotice: false,
  followCellsOpen: true,
};


const LOCKED: ProfileProjection = {
  locked: true,
  showsTabs: false,
  showsShowcase: false,
  showsNotice: true,
  followCellsOpen: false,
};


export function profileProjection(
  visibility: ProfileVisibility,
  viewerRelation: ViewerRelation,
): ProfileProjection {
  if (visibility === 'public' || viewerRelation === 'following') {
    return OPEN;
  }
  return LOCKED;
}
