/**
 * The GIS loader — the preview's Google credential source (S0.6).
 *
 * <p><strong>What these defend.</strong> This module's whole job is to be ready before a founder
 * clicks: the script must load once, initialize button-only, and hand the credential to whoever
 * asked. The failures worth catching here are the quiet ones — a second script tag on a re-render,
 * an `initialize` that silently enables One Tap (a founder-visible overlay the story ruled out), or
 * a `renderButton` that runs before the script arrives and throws into a callback nobody catches.
 *
 * <p>`document` and the `google.accounts.id` global are stubbed: this module IS the SDK boundary,
 * so there is nothing else to isolate. Under jest-expo's native preset there is no real DOM — which
 * is fine, because what is asserted is the contract we hold GIS to, not what GIS does with it. The
 * browser's half is proven in the preview container (ticket 03).
 */

interface InitializeConfig {
  client_id: string;
  callback: (response: { credential: string }) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

const mockInitialize = jest.fn();
const mockRenderButton = jest.fn();
const mockPrompt = jest.fn();
const mockDisableAutoSelect = jest.fn();

/** Stands in for the script tag GIS injects; `load()` resolves when the "script" fires onload. */
function stubDocument(options: { autoLoad?: boolean } = {}): { scripts: FakeScript[] } {
  const scripts: FakeScript[] = [];

  const createElement = (tag: string): FakeScript => {
    const element: FakeScript = {
      tag,
      src: '',
      async: false,
      defer: false,
      onload: null,
      onerror: null,
    };
    return element;
  };

  const appendChild = (element: FakeScript): FakeScript => {
    scripts.push(element);
    // The real script tag fires onload after the network; `autoLoad` simulates that synchronously
    // so a test can await load() without orchestrating timers.
    if (options.autoLoad !== false) {
      installGoogleGlobal();
      queueMicrotask(() => element.onload?.());
    }
    return element;
  };

  Object.defineProperty(global, 'document', {
    configurable: true,
    value: {
      createElement,
      head: { appendChild },
      querySelector: (selector: string) =>
        scripts.find((s) => selector.includes('gsi/client') && s.src.includes('gsi/client')) ?? null,
      getElementById: () => null,
    },
  });

  return { scripts };
}

interface FakeScript {
  tag: string;
  src: string;
  async: boolean;
  defer: boolean;
  onload: (() => void) | null;
  onerror: (() => void) | null;
}

/** The config GIS was initialized with, on the nth call — asserted present rather than `!`-ed. */
function initializeConfig(nth = 0): InitializeConfig {
  const call = mockInitialize.mock.calls[nth];
  if (call === undefined) throw new Error(`initialize was not called ${nth + 1} time(s)`);
  return call[0] as InitializeConfig;
}

function installGoogleGlobal(): void {
  (global as unknown as { google: unknown }).google = {
    accounts: {
      id: {
        initialize: (config: InitializeConfig) => mockInitialize(config),
        renderButton: (parent: unknown, options: unknown) => mockRenderButton(parent, options),
        prompt: () => mockPrompt(),
        disableAutoSelect: () => mockDisableAutoSelect(),
      },
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  delete (global as unknown as { google?: unknown }).google;
});

describe('loading the GIS script (S0.6)', () => {
  it('injects the script once, however many callers ask', async () => {
    const { scripts } = stubDocument();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const gis = require('../src/auth/googleIdentityServices');
    gis.configure('client-123.apps.googleusercontent.com');

    // Two components mounting (or one re-rendering) must not mean two script tags: GIS re-registers
    // its globals on each load, and the second would silently clobber the first's callback.
    await Promise.all([gis.load(), gis.load(), gis.load()]);

    expect(scripts.filter((s) => s.src.includes('gsi/client'))).toHaveLength(1);

    const [script] = scripts;
    if (script === undefined) throw new Error('no script was appended');
    expect(script.src).toBe('https://accounts.google.com/gsi/client');
    // Not render-blocking: the sign-in screen must paint before Google's CDN answers.
    expect(script.async).toBe(true);
  });

  it('initializes button-only — never One Tap (S0.6 scope boundary)', async () => {
    stubDocument();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const gis = require('../src/auth/googleIdentityServices');
    gis.configure('client-123.apps.googleusercontent.com');
    await gis.load();

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    const config = initializeConfig();
    expect(config.client_id).toBe('client-123.apps.googleusercontent.com');

    // The decision, made executable: One Tap is the overlay that appears uninvited on page load,
    // and it would make the preview *more* capable than the app it previews (spec). `prompt()` is
    // how it is summoned — never called — and auto_select is how it signs someone in with no click
    // at all.
    expect(mockPrompt).not.toHaveBeenCalled();
    expect(config.auto_select).toBe(false);
  });

  it('rejects when the script cannot load rather than hanging forever', async () => {
    const { scripts } = stubDocument({ autoLoad: false });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const gis = require('../src/auth/googleIdentityServices');
    gis.configure('client-123.apps.googleusercontent.com');

    const loading = gis.load();
    const [script] = scripts;
    if (script === undefined) throw new Error('no script was appended');
    script.onerror?.();

    // A blocked CDN (adblocker, corporate proxy, offline founder) must surface as a failed sign-in
    // with a message, not a spinner that never resolves.
    await expect(loading).rejects.toThrow();
  });

  it('refuses to load without a client id, naming the missing config', async () => {
    stubDocument();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const gis = require('../src/auth/googleIdentityServices');

    // Same stance as native's installGoogleSignIn: a misconfigured build fails loudly, not at the
    // first click with an unexplained error (S0.2's recorded lesson).
    await expect(gis.load()).rejects.toThrow(/client id/i);
  });
});

describe('rendering the button and receiving a credential (S0.6)', () => {
  it('renders Google’s button into the host element', async () => {
    stubDocument();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const gis = require('../src/auth/googleIdentityServices');
    gis.configure('client-123.apps.googleusercontent.com');

    const host = { id: 'host' };
    await gis.renderButton(host as unknown as HTMLElement, jest.fn());

    expect(mockRenderButton).toHaveBeenCalledTimes(1);
    expect(mockRenderButton.mock.calls[0][0]).toBe(host);
  });

  it('hands the credential to the caller’s callback', async () => {
    stubDocument();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const gis = require('../src/auth/googleIdentityServices');
    gis.configure('client-123.apps.googleusercontent.com');

    const onCredential = jest.fn();
    await gis.renderButton({} as unknown as HTMLElement, onCredential);

    // GIS owns the click: the credential arrives by callback, not from a promise we awaited. This
    // is the control-flow inversion the story accepted — and the reason the button component has to
    // drive the screen's busy/message state itself.
    initializeConfig().callback({ credential: 'google-id-token' });

    expect(onCredential).toHaveBeenCalledWith('google-id-token');
  });

  it('routes a later click to the newest callback, not a stale one', async () => {
    stubDocument();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const gis = require('../src/auth/googleIdentityServices');
    gis.configure('client-123.apps.googleusercontent.com');

    const stale = jest.fn();
    const fresh = jest.fn();
    await gis.renderButton({} as unknown as HTMLElement, stale);
    await gis.renderButton({} as unknown as HTMLElement, fresh);

    // A remount (Fast Refresh, navigation back to sign-in) must not leave the first render's
    // closure holding the credential — the founder would click and nothing would happen, the exact
    // dead-click this story exists to prevent, one layer deeper.
    initializeConfig(mockInitialize.mock.calls.length - 1).callback({ credential: 'token' });

    expect(fresh).toHaveBeenCalledWith('token');
    expect(stale).not.toHaveBeenCalled();
  });
});
