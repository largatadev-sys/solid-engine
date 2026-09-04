import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  stubCommentCountFor,
  stubLikeCountFor,
  STUB_METRICS_ON,
} from '../src/profile/stubMetrics';

const MOBILE_ROOT = join(__dirname, '..');

const COMPOSER = readFileSync(
  join(MOBILE_ROOT, 'app', '(tabs)', '(trips)', 'itineraries', '[id]', 'diary', 'compose.tsx'),
  'utf8',
);
const PREVIEW = readFileSync(join(MOBILE_ROOT, 'src', 'diary', 'PostcardPreview.tsx'), 'utf8');
const POSTCARD = readFileSync(join(MOBILE_ROOT, 'src', 'diary', 'Postcard.tsx'), 'utf8');
const REPOSITORY = readFileSync(
  join(MOBILE_ROOT, 'src', 'repositories', 'diaryRepository.ts'),
  'utf8',
);


describe('the composer carries no audience statement at all (S4.40)', () => {
  it('says nothing about who can see a postcard, since a private profile changes the answer', () => {
    expect(COMPOSER).not.toContain('DiaryPrivacyNote');
    expect(COMPOSER).not.toContain('Home feed');
    expect(existsSync(join(MOBILE_ROOT, 'src', 'diary', 'DiaryPrivacyNote.tsx'))).toBe(false);
  });

  it('offers no toggle, so posting is the whole act', () => {
    expect(COMPOSER).not.toContain('ShareToFeedToggle');
    expect(COMPOSER).not.toContain('shareToFeed');
    expect(existsSync(join(MOBILE_ROOT, 'src', 'diary', 'ShareToFeedToggle.tsx'))).toBe(false);
  });
});


describe('nothing in the diary offers to share a postcard to the feed', () => {
  it('the preview Share is the send-it-to-someone stub it was before S4.22', () => {
    expect(PREVIEW).toContain("comingSoon('share')");
    expect(PREVIEW).not.toContain('onShareChange');
    expect(PREVIEW).not.toContain('sharedAt');
  });

  it('the repository has no share resource left to call', () => {
    expect(REPOSITORY).not.toContain('/share');
    expect(REPOSITORY).not.toContain('shareToFeed');
    expect(REPOSITORY).not.toContain('unshareFromFeed');
  });

  it('a postcard wears no Shared badge, which would mark every one of them', () => {
    expect(POSTCARD).not.toContain('SHARED_BADGE');
  });
});


describe('stub counts hold still for a given postcard', () => {
  it('draws once per subject and then remembers, so an optimistic heart has a stable base', () => {
    const first = stubLikeCountFor('entry-1');
    expect(stubLikeCountFor('entry-1')).toBe(first);
    expect(stubLikeCountFor('entry-1')).toBe(first);
  });

  it('gives different postcards their own numbers', () => {
    const drawn = new Set(
      Array.from({ length: 40 }, (_unused, index) => stubLikeCountFor(`entry-${index}`)),
    );
    expect(drawn.size).toBeGreaterThan(1);
  });

  it('reaches past 999 so the compact formatting is exercised by real stub data', () => {
    const drawn = Array.from({ length: 400 }, (_unused, index) =>
      stubLikeCountFor(`spread-${index}`),
    );
    expect(Math.max(...(drawn as number[]))).toBeGreaterThan(999);
    expect(Math.min(...(drawn as number[]))).toBeGreaterThanOrEqual(1);
  });

  it('counts comments on the same terms', () => {
    const first = stubCommentCountFor('entry-1');
    expect(stubCommentCountFor('entry-1')).toBe(first);
    expect(first).not.toBeNull();
  });

  it('vanishes entirely with the kill-switch off, rather than showing a zero', () => {
    expect(stubLikeCountFor('entry-1', false)).toBeNull();
    expect(stubCommentCountFor('entry-1', false)).toBeNull();
  });

  it('keeps the one switch the profile already ships', () => {
    expect(STUB_METRICS_ON).toBe(true);
  });
});


describe('the share is wired through the repository layer, never a raw call', () => {
  it('has a feed repository and query module of its own', () => {
    expect(existsSync(join(MOBILE_ROOT, 'src', 'repositories', 'feedRepository.ts'))).toBe(true);
    expect(existsSync(join(MOBILE_ROOT, 'src', 'query', 'feedQueries.ts'))).toBe(true);
  });

  it('treats a null cursor as exhausted, the S3.1 lesson', () => {
    const queries = readFileSync(join(MOBILE_ROOT, 'src', 'query', 'feedQueries.ts'), 'utf8');
    expect(queries).toContain('lastPage.nextCursor ?? undefined');
    expect(queries).not.toContain('!== undefined');
  });
});
