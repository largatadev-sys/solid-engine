import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WORKSPACE_TABS, workspaceTabFrom } from '../src/itineraries/WorkspaceTabRow';
import { chatCopy } from '../src/theme/workspaceTokens';


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

const CHAT_DIR = join(MOBILE_ROOT, 'src', 'chat');


function chatSource(file: string): string {
  return readFileSync(join(CHAT_DIR, file), 'utf8');
}


describe('the Chat tab goes live — S4.10', () => {

  it('has stopped greying the Chat tab', () => {
    const chat = WORKSPACE_TABS.find((tab) => tab.key === 'chat');

    expect(chat?.comingSoonSurface).toBeUndefined();
  });


  it('routes to the thread rather than falling back to Day-by-Day', () => {
    expect(workspaceTabFrom('chat')).toBe('chat');
  });


  it('renders the thread on the workspace host', () => {
    const screen = readFileSync(WORKSPACE_SCREEN, 'utf8');

    expect(screen).toContain('WorkspaceChatTab');
    expect(screen).toMatch(/active === 'chat'/);
  });


  it('hands the tab the archived flag, so the notice bar is not a guess', () => {
    const screen = readFileSync(WORKSPACE_SCREEN, 'utf8');
    const mount = screen.slice(screen.indexOf("active === 'chat'"));

    expect(mount.slice(0, 260)).toContain('archived');
  });
});


describe('the copy strings are the canvas strings, exactly', () => {

  it('says what frame 2 says on the empty thread', () => {
    expect(chatCopy.empty).toBe('Say hello — the plan starts here.');
  });


  it('says what frame 5 says on an archived trip', () => {
    expect(chatCopy.archived).toBe('This trip is archived — chat is closed.');
  });


  it('says what frame 4 says when a send fails', () => {
    expect(chatCopy.failed).toBe("Couldn't send");
    expect(chatCopy.retry).toBe('Retry');
    expect(chatCopy.discard).toBe('Discard');
  });


  it('uses the canvas placeholder, ellipsis and all', () => {
    expect(chatCopy.placeholder).toBe('Message…');
  });
});


describe('the ruled-out list renders nowhere (decision 7)', () => {

  const RULED_OUT = [
    /\bunread\b/i,
    /\breceipts?\b/i,
    /\btyping\b/i,
    /\breactions?\b/i,
    /\bpresence\b/i,
    /\bseen\b/i,
    /\bdelivered\b/i,
    /\bmentions?\b/i,
    /\bbadge\b/i,
  ];

  it('names none of the forbidden affordances anywhere in the chat surface', () => {
    const surface = [
      'WorkspaceChatTab.tsx',
      'MessageBubble.tsx',
      'Composer.tsx',
      'ThreadFurniture.tsx',
      'FailedSendRow.tsx',
    ]
      .map(chatSource)
      .join('\n');

    for (const forbidden of RULED_OUT) {
      expect(surface).not.toMatch(forbidden);
    }
  });


  it('the new-messages pill is a scroll affordance, carrying no server-side count', () => {
    const tab = chatSource('WorkspaceChatTab.tsx');

    expect(tab).toContain('NewMessagesPill');
    expect(chatCopy.newMessages).toBe('↓ New messages');
    expect(chatCopy.newMessages).not.toMatch(/\d/);
  });


  it('carries no attachment, camera or photo affordance in the composer', () => {
    const composer = chatSource('Composer.tsx').toLowerCase();

    expect(composer).not.toContain('photo');
    expect(composer).not.toContain('camera');
    expect(composer).not.toContain('attach');
  });
});


describe('the motion contract is wired to the shared vocabulary (M1-M5)', () => {

  it('runs the entrance on the native driver, opacity and translate only', () => {
    const entrance = chatSource('MessageEntrance.tsx');

    expect(entrance).toContain('useNativeDriver: true');
    expect(entrance).toContain('translateY');
    expect(entrance).not.toContain('scale');
    expect(entrance).not.toContain('spring');
  });


  it('jump-cuts the entrance under Reduce Motion but keeps the fades', () => {
    expect(chatSource('MessageEntrance.tsx')).toContain('useReducedMotion');
    expect(chatSource('FailedSendRow.tsx')).toContain('stateChangeMs');
  });


  it('animates the composer only on native, where LayoutAnimation is not a no-op', () => {
    expect(chatSource('composerGrowth.native.ts')).toContain('LayoutAnimation');
    expect(chatSource('composerGrowth.web.ts')).toContain('transitionDuration');
  });


  it('never animates a bubble entrance for history paged in on scroll-back', () => {
    expect(chatSource('WorkspaceChatTab.tsx')).toContain('animate={fresh}');
  });
});
