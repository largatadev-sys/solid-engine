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
    const mount = screen.slice(screen.indexOf('<WorkspaceChatTab'));

    expect(mount).not.toBe('');
    expect(mount.slice(0, 200)).toContain('archived');
  });


  it('gives the thread a bounded height so the composer docks rather than scrolling away', () => {
    const screen = readFileSync(WORKSPACE_SCREEN, 'utf8');

    expect(screen).toMatch(/scrollEnabled=\{active !== 'chat'\}/);
    expect(screen).toMatch(/dockedContainer:[\s\S]{0,80}height: '100%'/);
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


  it('measures the field height from exactly one driver on each platform', () => {
    expect(chatSource('composerGrowth.web.ts')).toContain('MEASURES_FROM_A_MIRROR = true');
    expect(chatSource('composerGrowth.native.ts')).toContain('MEASURES_FROM_A_MIRROR = false');

    const composer = chatSource('Composer.tsx');
    expect(composer).toMatch(/if \(!MEASURES_FROM_A_MIRROR\) return;/);
    expect(composer).toMatch(/MEASURES_FROM_A_MIRROR\s*\n?\s*\? undefined/);
  });


  it('never measures the live field on web, which would kill the height transition', () => {
    const web = chatSource('composerGrowth.web.ts');

    expect(web).toContain('mirror');
    expect(web).not.toMatch(/node\.style\.height\s*=/);
  });


  it('leaves no message text behind in the measuring mirror', () => {
    const web = chatSource('composerGrowth.web.ts');
    const afterMeasuring = web.slice(web.indexOf('mirror.offsetHeight'));

    expect(afterMeasuring).toMatch(/mirror\.textContent = '';/);
    expect(web).toContain("setAttribute('aria-hidden', 'true')");
  });


  it('renders a real profile photo on the chat head, falling back to tinted initials', () => {
    const bubble = chatSource('MessageBubble.tsx');

    expect(bubble).toContain('MediaThumb');
    expect(bubble).toMatch(/url=\{message\.avatarUrl\}/);
    expect(bubble).toMatch(/fallback=\{<Text[\s\S]{0,120}avatarLabel\(message\)/);
  });


  it('leaves the bubble to the platform copy sheet and gives it no press feedback', () => {
    const bubble = chatSource('MessageBubble.tsx');

    expect(bubble).toMatch(/<Text selectable/);
    expect(bubble).not.toMatch(/onLongPress/);
    expect(bubble).not.toMatch(/Clipboard|copyMessage/);
    expect(bubble).not.toMatch(/usePressFeedback|Pressable/);
  });


  it('never animates a bubble entrance for history paged in on scroll-back', () => {
    expect(chatSource('WorkspaceChatTab.tsx')).toContain('animate={fresh}');
  });
});
