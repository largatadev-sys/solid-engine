import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { feedMetrics, feedTypography } from '../src/theme/feedTokens';
import { memoryMetrics, memoryTypography } from '../src/theme/memoryTokens';
import { spacing } from '../src/theme/tokens';
import { profileTypography } from '../src/theme/workspaceTokens';

const SRC = join(__dirname, '..', 'src');

function source(...parts: string[]): string {
  return readFileSync(join(SRC, ...parts), 'utf8');
}

describe('the three tab roots wear the same header', () => {
  it('titles them all at the same size and weight', () => {
    [
      feedTypography.wordmark,
      profileTypography.displayName,
      memoryTypography.displayName,
    ].forEach((face) => expect(face.fontSize).toBe(22));
  });

  it('each screen reaches for its own 22px face rather than a smaller one', () => {
    expect(source('feed', 'FeedHeader.tsx')).toContain('...feedTypography.wordmark');
    expect(source('discovery', 'DiscoveryLandingScreen.tsx')).toContain(
      '...profileTypography.displayName',
    );
    expect(source('profile', 'ProfileHeader.tsx')).toContain('...memoryTypography.displayName');
  });

  it('starts them all the same distance down the screen', () => {
    expect(spacing.sm3).toBe(12);
    expect(source('feed', 'FeedHeader.tsx')).toContain('paddingVertical: spacing.sm3');
    expect(source('discovery', 'DiscoveryLandingScreen.tsx')).toContain(
      'paddingTop: spacing.sm3',
    );
    expect(source('profile', 'ProfileHeader.tsx')).toContain('paddingTop: spacing.sm3');
  });

  it('keeps their action buttons one size', () => {
    expect(feedMetrics.iconButton).toBe(memoryMetrics.headerButton);

    expect(source('feed', 'FeedHeader.tsx')).toContain('feedMetrics.iconButton');
    expect(source('profile', 'ProfileHeader.tsx')).toContain('memoryMetrics.headerButton');
  });
});
