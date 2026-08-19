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

  it('stays greyed for the surfaces S2.1 did not build', () => {
    const chat = WORKSPACE_TABS.find((tab) => tab.key === 'chat');

    expect(chat?.comingSoonSurface).toBe('chat');
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
