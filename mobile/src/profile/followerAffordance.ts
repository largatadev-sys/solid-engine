import type { FollowListSide } from './FollowListScreen';


export type RowAffordance = 'kebab' | 'chevron';


export function rowAffordance(side: FollowListSide, isSelf: boolean): RowAffordance {
  return isSelf && side === 'followers' ? 'kebab' : 'chevron';
}
