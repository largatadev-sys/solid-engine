export type FeedScope = 'all' | 'following';

export const DEFAULT_FEED_SCOPE: FeedScope = 'all';


export function scopeParam(scope: FeedScope): string | undefined {
  return scope === 'following' ? 'following' : undefined;
}
