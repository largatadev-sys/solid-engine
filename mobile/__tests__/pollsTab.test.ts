import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WORKSPACE_TABS, workspaceTabFrom } from '../src/itineraries/WorkspaceTabRow';


const MOBILE_ROOT = join(__dirname, '..');

const WORKSPACE_SCREEN = join(
  MOBILE_ROOT,
  'app',
  '(tabs)',
  '(trips)',
  'itineraries',
  '[id]',
  'index.tsx',
);

const CREATE_SCREEN = join(
  MOBILE_ROOT,
  'app',
  '(tabs)',
  '(trips)',
  'itineraries',
  '[id]',
  'polls',
  'new.tsx',
);


describe('the Polls tab goes live on the shipped row — S2.1', () => {
  it('has stopped greying the Polls tab', () => {
    const polls = WORKSPACE_TABS.find((tab) => tab.key === 'polls');

    expect(polls?.comingSoonSurface).toBeUndefined();
  });

  it('routes to the board rather than falling back to Day-by-Day', () => {
    expect(workspaceTabFrom('polls')).toBe('polls');
  });

  it('no longer greys Chat, which S4.10 built', () => {
    const chat = WORKSPACE_TABS.find((tab) => tab.key === 'chat');

    expect(chat?.comingSoonSurface).toBeUndefined();
  });

  it('renders the board on the workspace host, on both surfaces the row serves', () => {
    const screen = readFileSync(WORKSPACE_SCREEN, 'utf8');

    expect(screen).toContain('WorkspacePollsTab');
    expect(screen).toMatch(/active === 'polls'/);
  });

  it('hands the tab the archived flag, so the fence chrome is not a guess', () => {
    const screen = readFileSync(WORKSPACE_SCREEN, 'utf8');
    const mount = screen.slice(screen.indexOf("active === 'polls'"));

    expect(mount.slice(0, 300)).toContain('archived');
    expect(mount.slice(0, 300)).toContain('isOwner');
  });

  it('reaches the create screen through a route, never a raw fetch or an Alert', () => {
    const create = readFileSync(CREATE_SCREEN, 'utf8');

    expect(create).not.toMatch(/from ['"].*api\/apiClient['"]/);
    expect(create).not.toContain('Alert.alert');
  });

  it('confirms delete in an in-app dialog, not a platform one — v2 draws the frame', () => {
    const tab = readFileSync(join(MOBILE_ROOT, 'src/polls/WorkspacePollsTab.tsx'), 'utf8');

    expect(tab).toContain('PollDeleteDialog');
    expect(tab)
      .not.toContain('confirmWith');
  });

  it('retains the whole poll while the dialog fades, never a field of it (the S3.4 tear)', () => {
    const dialog = readFileSync(join(MOBILE_ROOT, 'src/polls/PollDeleteDialog.tsx'), 'utf8');

    expect(dialog).toContain('stillShowing');
  });

  it('draws no kebab and no menu — v2 cut the whole interaction mode', () => {
    const sources = ['src/polls/PollCard.tsx', 'src/polls/pollBoard.ts'].map((file) =>
      readFileSync(join(MOBILE_ROOT, file), 'utf8'),
    );

    for (const source of sources) {
      expect(source).not.toMatch(/kebab/i);
    }
  });

  it('never relabels the vote button — one label, from the pure module', () => {
    const card = readFileSync(join(MOBILE_ROOT, 'src/polls/PollCard.tsx'), 'utf8');

    expect(card).not.toContain('Change Vote');
    expect(card).toContain('submitButtonFor');
  });

  it('never draws the export’s stale "Added to Itinerary" label anywhere in the surface', () => {
    const surfaces = [
      'src/polls/PollCard.tsx',
      'src/polls/PollOptionRow.tsx',
      'src/polls/WorkspacePollsTab.tsx',
      'src/polls/pollMessages.ts',
    ].map((file) => readFileSync(join(MOBILE_ROOT, file), 'utf8'));

    for (const source of surfaces) {
      expect(source).not.toContain('Added to Itinerary');
    }
  });
});
