

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

    await Promise.all([gis.load(), gis.load(), gis.load()]);

    expect(scripts.filter((s) => s.src.includes('gsi/client'))).toHaveLength(1);

    const [script] = scripts;
    if (script === undefined) throw new Error('no script was appended');
    expect(script.src).toBe('https://accounts.google.com/gsi/client');
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

    await expect(loading).rejects.toThrow();
  });

  it('refuses to load without a client id, naming the missing config', async () => {
    stubDocument();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const gis = require('../src/auth/googleIdentityServices');

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

    initializeConfig(mockInitialize.mock.calls.length - 1).callback({ credential: 'token' });

    expect(fresh).toHaveBeenCalledWith('token');
    expect(stale).not.toHaveBeenCalled();
  });
});
