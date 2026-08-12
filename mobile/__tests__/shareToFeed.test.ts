import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DIARY_PRIVACY_NOTE,
  DIARY_SHARED_NOTE,
  SHARE_ENTRY_ACTION,
  SHARE_TO_FEED_LABEL,
  UNSHARE_ENTRY_ACTION,
} from '../src/diary/diaryCopy';
import {
  forgetStubCounts,
  stubCommentCountFor,
  stubLikeCountFor,
  STUB_METRICS_ON,
} from '../src/profile/stubMetrics';

const MOBILE_ROOT = join(__dirname, '..');

const NOTE = readFileSync(join(MOBILE_ROOT, 'src', 'diary', 'DiaryPrivacyNote.tsx'), 'utf8');
const TOGGLE = readFileSync(join(MOBILE_ROOT, 'src', 'diary', 'ShareToFeedToggle.tsx'), 'utf8');
const COMPOSER = readFileSync(
  join(MOBILE_ROOT, 'app', '(tabs)', '(trips)', 'itineraries', '[id]', 'diary', 'compose.tsx'),
  'utf8',
);
const PREVIEW = readFileSync(join(MOBILE_ROOT, 'src', 'diary', 'PostcardPreview.tsx'), 'utf8');
const REPOSITORY = readFileSync(
  join(MOBILE_ROOT, 'src', 'repositories', 'diaryRepository.ts'),
  'utf8',
);


describe('the composer says who will see the postcard, and changes its mind with the toggle', () => {
  it('keeps S3.1 wording while the postcard stays private', () => {
    expect(DIARY_PRIVACY_NOTE).toBe('Only you can see your diary. It shows up on your profile.');
  });

  it('says plainly that the postcard goes public once the toggle is on', () => {
    expect(DIARY_SHARED_NOTE).toContain('Home feed');
    expect(DIARY_SHARED_NOTE).toContain('any Largata traveler');
    expect(DIARY_SHARED_NOTE.toLowerCase()).toContain('unshare');
  });

  it('reads the toggle rather than a second source of truth', () => {
    expect(NOTE).toContain('shared ? DIARY_SHARED_NOTE : DIARY_PRIVACY_NOTE');
    expect(COMPOSER).toContain('<DiaryPrivacyNote shared={shareToFeed} />');
  });

  it('is off by default, so posting can never publish by accident', () => {
    expect(COMPOSER).toContain('useState(false)');
    expect(COMPOSER).toContain('shareToFeed,');
  });

  it('announces itself as a switch, so a screen reader states the privacy choice', () => {
    expect(TOGGLE).toContain("accessibilityRole=\"switch\"");
    expect(TOGGLE).toContain('accessibilityState={{ checked: on }}');
    expect(SHARE_TO_FEED_LABEL).toBe('Share to feed');
  });
});


describe('retro-share from the diary', () => {
  it('offers the opposite act for whichever state the postcard is in', () => {
    expect(SHARE_ENTRY_ACTION).toBe('Share to feed');
    expect(UNSHARE_ENTRY_ACTION).toBe('Remove from feed');
    expect(PREVIEW).toContain('showing.sharedAt === null ? SHARE_ENTRY_ACTION : UNSHARE_ENTRY_ACTION');
  });

  it('reads the retained subject, never the live prop, so the dialog does not tear down in stages', () => {
    expect(PREVIEW).toContain('onShareChange(showing,');
    expect(PREVIEW).not.toContain('onShareChange(entry,');
  });

  it('leaves the share-sheet stub alone where no share-to-feed handler is given', () => {
    expect(PREVIEW).toContain("comingSoon('share')");
  });

  it('shares and unshares over the one entry resource', () => {
    expect(REPOSITORY).toContain('/share');
    expect(REPOSITORY).toContain('deleteReturning<DiaryEntryResponse>');
  });
});


describe('stub counts hold still for a given postcard', () => {
  beforeEach(forgetStubCounts);

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
