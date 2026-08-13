import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stubCommentCountFor, stubLikeCountFor } from '../src/profile/stubMetrics';

const MOBILE_ROOT = join(__dirname, '..');
const CARD = readFileSync(join(MOBILE_ROOT, 'src', 'feed', 'FeedCard.tsx'), 'utf8');


describe('the kill-switch takes the numbers away without taking the layout with them', () => {
  it('yields null rather than zero, so the row can vanish instead of lying', () => {
    expect(stubLikeCountFor('c1', false)).toBeNull();
    expect(stubCommentCountFor('c1', false)).toBeNull();
  });

  it('gates the engagement controls on that null, not on a separate flag', () => {
    expect(CARD).toContain('{like !== null && (');
  });

  it('keeps the share and save controls outside the gate — they are honest either way', () => {
    const gated = CARD.slice(CARD.indexOf('{like !== null && ('), CARD.indexOf('<View style={styles.spacer} />'));

    expect(gated).toContain('Like this postcard');
    expect(gated).toContain('Comment on this postcard');
    expect(gated).not.toContain('Share this postcard');
    expect(gated).not.toContain('Save this postcard');
  });

  it('leaves the card structure standing — the row is a sibling, never the wrapper', () => {
    expect(CARD).toContain('styles.engagement');
    expect(CARD.indexOf('styles.engagement')).toBeLessThan(CARD.indexOf('{like !== null && ('));
  });
});
