import type { ViewerRelation } from '../types/api';


export interface CreatorPillState {
  readonly shown: boolean;
  readonly relation: ViewerRelation;
}


const HIDDEN: CreatorPillState = { shown: false, relation: 'none' };


export function creatorPill(args: {
  readonly isOwnProfile: boolean;
  readonly handle: string | null;
  readonly loading: boolean;
  readonly failed: boolean;
  readonly relation: ViewerRelation | undefined;
}): CreatorPillState {
  if (args.isOwnProfile || args.handle === null || args.loading || args.failed) {
    return HIDDEN;
  }
  if (args.relation === undefined) {
    return HIDDEN;
  }
  return { shown: true, relation: args.relation };
}
