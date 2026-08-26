import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_FEED_SCOPE, scopeParam } from '../src/feed/feedScope';

const MOBILE_ROOT = join(__dirname, '..');

const SCREEN = readFileSync(join(MOBILE_ROOT, 'src', 'feed', 'FeedScreen.tsx'), 'utf8');


describe('the Home filter: All is where every cold start lands', () => {
  it('opens on All, never on a lane the traveler has to undo', () => {
    expect(DEFAULT_FEED_SCOPE).toBe('all');
  });

  it('asks the server for nothing extra on All, so that lane is byte-for-byte today', () => {
    expect(scopeParam('all')).toBeUndefined();
  });

  it('narrows the query on Following rather than filtering after the fact', () => {
    expect(scopeParam('following')).toBe('following');
  });

  it('holds the choice in component state only — never in storage', () => {
    expect(SCREEN).toContain('useState<FeedScope>(DEFAULT_FEED_SCOPE)');
    expect(SCREEN).not.toContain('AsyncStorage');
    expect(SCREEN).not.toContain('saveScope');
  });

  it('hands the scope to the feed query, so the narrowing happens server-side', () => {
    expect(SCREEN).toContain('useFeed(scope)');
  });
});
