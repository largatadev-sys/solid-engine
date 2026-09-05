import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MOBILE_ROOT = join(__dirname, '..');

const PREVIEW = readFileSync(
  join(MOBILE_ROOT, 'app', '(tabs)', '(trips)', 'itineraries', '[id]', 'preview.tsx'),
  'utf8',
);
const COMPOSER = readFileSync(
  join(MOBILE_ROOT, 'app', '(tabs)', '(trips)', 'itineraries', '[id]', 'diary', 'compose.tsx'),
  'utf8',
);
const ENTRY_SCREEN = readFileSync(join(MOBILE_ROOT, 'src', 'diary', 'DiaryEntryScreen.tsx'), 'utf8');
const TYPES = readFileSync(join(MOBILE_ROOT, 'src', 'types', 'api.ts'), 'utf8');
const REPOSITORY = readFileSync(
  join(MOBILE_ROOT, 'src', 'repositories', 'itineraryRepository.ts'),
  'utf8',
);


describe('the preview no longer asks which audience (S4.40 decision 13)', () => {
  it('offers no audience chip, so publishing has one outcome and no question', () => {
    expect(PREVIEW).not.toContain('Publish ${audienceLabel');
    expect(PREVIEW).not.toContain('audienceChip');
    expect(PREVIEW).not.toContain('AUDIENCES');
  });

  it('sends no audience to the server, which supplies its own constant', () => {
    expect(REPOSITORY).not.toContain('{ audience }');
    expect(REPOSITORY).not.toContain('/audience');
  });

  it('carries no audience vocabulary in the client types, since nothing chooses one', () => {
    expect(TYPES).not.toContain('PublishAudience');
    expect(TYPES).not.toMatch(/export type Visibility =/);
  });
});


describe('the composer states no audience (S4.40 decision 14)', () => {
  it('mounts the privacy note nowhere, because the component is gone', () => {
    expect(existsSync(join(MOBILE_ROOT, 'src', 'diary', 'DiaryPrivacyNote.tsx'))).toBe(false);
    expect(COMPOSER).not.toContain('DiaryPrivacyNote');
    expect(ENTRY_SCREEN).not.toContain('DiaryPrivacyNote');
  });
});
