import type { ViewerRelation } from '../types/api';
import { FOLLOWING_LABEL, FOLLOW_LABEL } from './publicProfileCopy';
import { REQUESTED_LABEL } from './privateProfileCopy';


export interface FollowPillTreatment {
  readonly label: string;
  readonly filled: boolean;
  readonly muted: boolean;
  readonly glyph: boolean;
}


const TREATMENTS: Record<ViewerRelation, FollowPillTreatment> = {
  none: { label: FOLLOW_LABEL, filled: true, muted: false, glyph: false },
  requested: { label: REQUESTED_LABEL, filled: false, muted: true, glyph: false },
  following: { label: FOLLOWING_LABEL, filled: false, muted: false, glyph: true },
};


export function followPillTreatment(relation: ViewerRelation): FollowPillTreatment {
  return TREATMENTS[relation];
}


export function followPillLabel(relation: ViewerRelation, displayName: string): string {
  return `${TREATMENTS[relation].label} ${displayName}`;
}
