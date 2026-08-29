import { readFileSync } from 'fs';
import { join } from 'path';

import { HIGH_ENTROPY_HINTS, readWebSignals } from '../src/feedback/captureDevice.web';
import {
  MAX_DEVICE_CHARS,
  nativeDeviceContext,
  webDeviceContext,
  type ClientHints,
  type WebSignals,
} from '../src/feedback/deviceContext';

const UA = {
  chromeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.120 Safari/537.36',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.2739.42',
  operaWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 OPR/114.0.0.0',
  firefoxWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0',
  firefoxMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:129.0) Gecko/20100101 Firefox/129.0',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:129.0) Gecko/129.0 Firefox/129.0',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  safariIpad:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  safariIpadOwning:
    'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36',
};

const CHROMIUM_BRANDS = [
  { brand: 'Not)A;Brand', version: '99' },
  { brand: 'Google Chrome', version: '128' },
  { brand: 'Chromium', version: '128' },
];


describe('what a web reporter is running, from Client Hints', () => {
  it('tells Windows 11 from Windows 10, which the frozen user-agent cannot', () => {
    expect(hinted({ platform: 'Windows', platformVersion: '15.0.0' }).os).toBe('Windows 11');
    expect(hinted({ platform: 'Windows', platformVersion: '10.0.0' }).os).toBe('Windows 10');
  });

  it('says Windows bare when the version is too old to distinguish', () => {
    expect(hinted({ platform: 'Windows', platformVersion: '0.3.0' }).os).toBe('Windows');
  });

  it('carries the real macOS version, which the user-agent freezes at 10.15.7', () => {
    expect(hinted({ platform: 'macOS', platformVersion: '14.6.0' }, UA.safariMac).os).toBe(
      'macOS 14.6',
    );
  });

  it('names the browser from the brands list, ignoring the greasy entry', () => {
    expect(hinted({ platform: 'Windows', platformVersion: '15.0.0' }).browser).toBe('Chrome 128');
  });

  it('prefers Edge over the Chrome brand it also advertises', () => {
    const brands = [...CHROMIUM_BRANDS, { brand: 'Microsoft Edge', version: '128' }];
    expect(hinted({ platform: 'Windows', platformVersion: '15.0.0', brands }).browser).toBe(
      'Edge 128',
    );
  });

  it('prefers Opera over the Chrome brand it also advertises', () => {
    const brands = [...CHROMIUM_BRANDS, { brand: 'Opera', version: '114' }];
    expect(hinted({ platform: 'Windows', platformVersion: '15.0.0', brands }).browser).toBe(
      'Opera 114',
    );
  });

  it('sends the device model when Client Hints supplies one', () => {
    const answer = hinted(
      { platform: 'Android', platformVersion: '14.0.0', model: 'Pixel 6' },
      UA.chromeAndroid,
    );
    expect(answer.os).toBe('Android 14');
    expect(answer.deviceModel).toBe('Pixel 6');
  });

  it('omits the device model rather than sending the empty string desktops report', () => {
    expect(hinted({ platform: 'Windows', platformVersion: '15.0.0', model: '' })).not.toHaveProperty(
      'deviceModel',
    );
  });
});


describe('what a web reporter is running, when Client Hints is absent', () => {
  it('reads the real iOS version off an iPhone user-agent', () => {
    expect(plain(UA.safariIphone)).toEqual({ os: 'iOS 17.5', browser: 'Safari 17.5' });
  });

  it('reads iPadOS off the Mac user-agent an iPad masquerades behind', () => {
    expect(plain(UA.safariIpad, 5).os).toBe('iPadOS');
  });

  it('keeps the version when an iPad owns up to being one, rather than throwing it away', () => {
    expect(plain(UA.safariIpadOwning, 5).os).toBe('iPadOS 17.5');
  });

  it('still says macOS for a real Mac, which reports no touch points', () => {
    expect(plain(UA.safariMac)).toEqual({ os: 'macOS', browser: 'Safari 17.6' });
  });

  it('says Windows bare rather than the frozen user-agent version', () => {
    expect(plain(UA.firefoxWindows)).toEqual({ os: 'Windows', browser: 'Firefox 129' });
  });

  it('reads the real Android version, which the user-agent does carry', () => {
    expect(plain(UA.firefoxAndroid)).toEqual({ os: 'Android 14', browser: 'Firefox 129' });
  });

  it('names Firefox on a Mac without claiming a version macOS never reports', () => {
    expect(plain(UA.firefoxMac)).toEqual({ os: 'macOS', browser: 'Firefox 129' });
  });

  it('names Edge and Opera from their own tokens, never the Chrome one they carry too', () => {
    expect(plain(UA.edgeWindows).browser).toBe('Edge 128');
    expect(plain(UA.operaWindows).browser).toBe('Opera 114');
  });

  it('names Chrome from its token', () => {
    expect(plain(UA.chromeWindows).browser).toBe('Chrome 128');
  });

  it('omits every field for a user-agent it cannot read, rather than guessing', () => {
    expect(plain('')).toEqual({});
  });

  it('never sends a device model on web without Client Hints, not even from an Android user-agent', () => {
    expect(plain(UA.chromeAndroid)).not.toHaveProperty('deviceModel');
  });
});


describe('what a native reporter is running', () => {
  it('composes the Android OS string from the release, and sends the model verbatim', () => {
    expect(nativeDeviceContext({ os: 'android', release: '14', model: 'Pixel 6' })).toEqual({
      os: 'Android 14',
      deviceModel: 'Pixel 6',
    });
  });

  it('sends a manufacturer model code exactly as the platform gives it', () => {
    expect(nativeDeviceContext({ os: 'android', release: '13', model: 'SM-S918B' }).deviceModel).toBe(
      'SM-S918B',
    );
  });

  it('says Android bare rather than "Android undefined" when the constant is missing', () => {
    expect(nativeDeviceContext({ os: 'android', model: 'Pixel 6' }).os).toBe('Android');
  });

  it('omits the model rather than inventing one when the constant is missing', () => {
    expect(nativeDeviceContext({ os: 'android', release: '14' })).not.toHaveProperty('deviceModel');
  });

  it('names iOS from its own system name and version', () => {
    expect(nativeDeviceContext({ os: 'ios', systemName: 'iOS', release: '17.5' }).os).toBe(
      'iOS 17.5',
    );
  });

  it('omits the iOS device model, which no story has chosen a source for yet', () => {
    expect(
      nativeDeviceContext({ os: 'ios', systemName: 'iOS', release: '17.5', model: 'iPhone15,3' }),
    ).not.toHaveProperty('deviceModel');
  });

  it('never sends a browser, because a native build is in no browser', () => {
    expect(nativeDeviceContext({ os: 'android', release: '14' })).not.toHaveProperty('browser');
  });
});


describe('a capture can never cost the traveler their report', () => {
  it('degrades to the user-agent when the high-entropy call rejects', async () => {
    const signals = await readWebSignals({
      userAgent: UA.chromeWindows,
      maxTouchPoints: 0,
      userAgentData: {
        brands: CHROMIUM_BRANDS,
        platform: 'Windows',
        getHighEntropyValues: () => Promise.reject(new Error('denied')),
      },
    });

    expect(webDeviceContext(signals!)).toEqual({ os: 'Windows', browser: 'Chrome 128' });
  });

  it('degrades to the user-agent when the high-entropy call never settles', async () => {
    const signals = await readWebSignals(
      {
        userAgent: UA.chromeWindows,
        maxTouchPoints: 0,
        userAgentData: { platform: 'Windows', getHighEntropyValues: () => new Promise(() => {}) },
      },
      5,
    );

    expect(webDeviceContext(signals!).os).toBe('Windows');
  });

  it('degrades to the user-agent when the whole Client-Hints API is absent', async () => {
    const signals = await readWebSignals({ userAgent: UA.safariIphone, maxTouchPoints: 5 });

    expect(webDeviceContext(signals!).os).toBe('iOS 17.5');
  });

  it('survives a navigator whose every property throws', async () => {
    const hostile = {
      get userAgent(): string {
        throw new Error('blocked');
      },
      get maxTouchPoints(): number {
        throw new Error('blocked');
      },
      get userAgentData(): never {
        throw new Error('blocked');
      },
    };

    expect(webDeviceContext((await readWebSignals(hostile))!)).toEqual({});
  });

  it('yields nothing at all when there is no navigator', async () => {
    expect(await readWebSignals(undefined)).toBeNull();
    expect(await readWebSignals(null)).toBeNull();
  });

  it('asks for exactly the two high-entropy hints it uses', async () => {
    const asked: string[][] = [];
    await readWebSignals({
      userAgent: UA.chromeWindows,
      maxTouchPoints: 0,
      userAgentData: {
        platform: 'Windows',
        getHighEntropyValues: (hints: string[]) => {
          asked.push(hints);
          return Promise.resolve({ platformVersion: '15.0.0' });
        },
      },
    });

    expect(asked).toEqual([HIGH_ENTROPY_HINTS]);
  });
});


describe('nothing leaves the device longer than worklog accepts', () => {
  it('clamps a pathological user-agent-derived browser name to the contract ceiling', () => {
    const answer = hinted({
      platform: 'Windows',
      platformVersion: '15.0.0',
      brands: [{ brand: 'B'.repeat(400), version: '1' }],
    });

    expect(answer.browser).toHaveLength(MAX_DEVICE_CHARS);
  });

  it('clamps a pathological device model', () => {
    const answer = hinted({
      platform: 'Android',
      platformVersion: '14.0.0',
      model: 'M'.repeat(500),
    });

    expect(answer.deviceModel).toHaveLength(MAX_DEVICE_CHARS);
  });

  it('clamps a pathological native model', () => {
    const answer = nativeDeviceContext({ os: 'android', release: '14', model: 'M'.repeat(500) });

    expect(answer.deviceModel).toHaveLength(MAX_DEVICE_CHARS);
  });
});


describe('the capture stays inside the binary the traveler already has', () => {
  it('imports no native module that only exists in a newly built app', () => {
    const source = readFileSync(
      join(__dirname, '..', 'src', 'feedback', 'captureDevice.native.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/expo-device/);
    expect(source).toMatch(/from 'react-native'/);
  });
});


function hinted(hints: ClientHints, userAgent: string = UA.chromeWindows): ReturnType<typeof webDeviceContext> {
  return webDeviceContext({
    userAgent,
    maxTouchPoints: 0,
    hints: { brands: CHROMIUM_BRANDS, ...hints },
  });
}


function plain(userAgent: string, maxTouchPoints: number = 0): ReturnType<typeof webDeviceContext> {
  return webDeviceContext({ userAgent, maxTouchPoints } satisfies WebSignals);
}
