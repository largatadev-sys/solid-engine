import type { ProfileVisibility, ViewerRelation } from '../types/api';


export interface ProfileProjection {
  readonly locked: boolean;
  readonly showsTabs: boolean;
  readonly showsShowcase: boolean;
  readonly showsNotice: boolean;
  readonly cellsOpen: boolean;
}


const OPEN: ProfileProjection = {
  locked: false,
  showsTabs: true,
  showsShowcase: true,
  showsNotice: false,
  cellsOpen: true,
};


const LOCKED: ProfileProjection = {
  locked: true,
  showsTabs: false,
  showsShowcase: false,
  showsNotice: true,
  cellsOpen: false,
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
