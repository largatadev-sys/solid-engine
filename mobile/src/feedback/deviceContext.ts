export const MAX_DEVICE_CHARS = 200;

export type DeviceContext = {
  readonly os?: string;
  readonly browser?: string;
  readonly deviceModel?: string;
};

export type UserAgentBrand = {
  readonly brand: string;
  readonly version: string;
};

export type ClientHints = {
  readonly brands?: readonly UserAgentBrand[];
  readonly platform?: string;
  readonly platformVersion?: string;
  readonly model?: string;
};

export type WebSignals = {
  readonly userAgent: string;
  readonly maxTouchPoints: number;
  readonly hints?: ClientHints;
};

export type NativeSignals = {
  readonly os: 'android' | 'ios';
  readonly release?: unknown;
  readonly model?: unknown;
  readonly systemName?: unknown;
};

const WINDOWS_11_PLATFORM_VERSION_MAJOR = 13;

const BRAND_NAMES: readonly (readonly [string, string])[] = [
  ['Microsoft Edge', 'Edge'],
  ['Opera', 'Opera'],
  ['Google Chrome', 'Chrome'],
  ['Chromium', 'Chromium'],
];


export function webDeviceContext(signals: WebSignals): DeviceContext {
  return context({
    os: webOs(signals),
    browser: webBrowser(signals),
    deviceModel: text(signals.hints?.model),
  });
}


export function nativeDeviceContext(signals: NativeSignals): DeviceContext {
  return context({ os: nativeOs(signals), deviceModel: nativeModel(signals) });
}


function nativeOs(signals: NativeSignals): string | undefined {
  if (signals.os === 'android') {
    const release = text(signals.release);
    return release === undefined ? 'Android' : `Android ${release}`;
  }
  const name = text(signals.systemName) ?? 'iOS';
  const release = text(signals.release);
  return release === undefined ? name : `${name} ${release}`;
}


function nativeModel(signals: NativeSignals): string | undefined {
  return signals.os === 'android' ? text(signals.model) : undefined;
}


function webOs(signals: WebSignals): string | undefined {
  return osFromHints(signals.hints) ?? osFromUserAgent(signals);
}


function osFromHints(hints: ClientHints | undefined): string | undefined {
  const platform = text(hints?.platform);
  if (platform === undefined) return undefined;
  const version = shortVersion(text(hints?.platformVersion));

  if (platform === 'Windows') return windowsName(text(hints?.platformVersion));
  if (platform === 'Chrome OS' || platform === 'Chromium OS') {
    return version === undefined ? 'Chrome OS' : `Chrome OS ${version}`;
  }
  return version === undefined ? platform : `${platform} ${version}`;
}


function windowsName(platformVersion: string | undefined): string {
  const major = majorOf(platformVersion);
  if (major === undefined || major === 0) return 'Windows';
  return major >= WINDOWS_11_PLATFORM_VERSION_MAJOR ? 'Windows 11' : 'Windows 10';
}


function osFromUserAgent(signals: WebSignals): string | undefined {
  const ua = signals.userAgent;

  const apple = /CPU (?:iPhone )?OS (\d+[_.]\d+(?:[_.]\d+)?)/.exec(ua);
  if (apple) {
    return withVersion(/\biPad\b/.test(ua) ? 'iPadOS' : 'iOS', apple[1]?.replace(/_/g, '.'));
  }

  const android = /Android (\d+(?:\.\d+)*)/.exec(ua);
  if (android) return withVersion('Android', android[1]);

  if (/\bCrOS\b/.test(ua)) return 'Chrome OS';

  if (/Macintosh|Mac OS X/.test(ua)) {
    return signals.maxTouchPoints > 1 ? 'iPadOS' : 'macOS';
  }

  if (/Windows NT/.test(ua)) return 'Windows';
  if (/\bLinux\b/.test(ua)) return 'Linux';
  return undefined;
}


function webBrowser(signals: WebSignals): string | undefined {
  return browserFromBrands(signals.hints?.brands) ?? browserFromUserAgent(signals.userAgent);
}


function browserFromBrands(brands: readonly UserAgentBrand[] | undefined): string | undefined {
  if (!Array.isArray(brands)) return undefined;
  const real = brands.filter((entry) => entry && !isGreasy(text(entry.brand)));

  for (const [brand, name] of BRAND_NAMES) {
    const match = real.find((entry) => text(entry.brand) === brand);
    if (match) return withVersion(name, text(match.version));
  }
  const first = real[0];
  const name = first === undefined ? undefined : text(first.brand);
  return name === undefined ? undefined : withVersion(name, text(first?.version));
}


function isGreasy(brand: string | undefined): boolean {
  return brand === undefined || /not.*a.*brand/i.test(brand);
}


function browserFromUserAgent(ua: string): string | undefined {
  const named: readonly (readonly [RegExp, string])[] = [
    [/\bEdg(?:e|A|iOS)?\/(\d+(?:\.\d+)*)/, 'Edge'],
    [/\bOPR\/(\d+(?:\.\d+)*)/, 'Opera'],
    [/\bOpera\/(\d+(?:\.\d+)*)/, 'Opera'],
    [/\b(?:Firefox|FxiOS)\/(\d+(?:\.\d+)*)/, 'Firefox'],
    [/\bCriOS\/(\d+(?:\.\d+)*)/, 'Chrome'],
    [/\bChrome\/(\d+(?:\.\d+)*)/, 'Chrome'],
  ];

  for (const [pattern, name] of named) {
    const match = pattern.exec(ua);
    if (match) return withVersion(name, match[1]);
  }

  if (/\bSafari\//.test(ua)) {
    const version = /\bVersion\/(\d+(?:\.\d+)*)/.exec(ua);
    return withVersion('Safari', version?.[1]);
  }
  return undefined;
}


function withVersion(name: string, version: string | undefined): string {
  const short = shortVersion(version);
  return short === undefined ? name : `${name} ${short}`;
}


function shortVersion(version: string | undefined): string | undefined {
  const raw = text(version);
  if (raw === undefined) return undefined;
  const segments = raw.split('.').slice(0, 2);
  while (segments.length > 1 && segments[segments.length - 1] === '0') {
    segments.pop();
  }
  return segments.join('.');
}


function majorOf(version: string | undefined): number | undefined {
  if (version === undefined) return undefined;
  const major = Number.parseInt(version.split('.')[0] ?? '', 10);
  return Number.isNaN(major) ? undefined : major;
}


function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}


function context(fields: DeviceContext): DeviceContext {
  const clamped: { os?: string; browser?: string; deviceModel?: string } = {};
  if (fields.os !== undefined) clamped.os = clamp(fields.os);
  if (fields.browser !== undefined) clamped.browser = clamp(fields.browser);
  if (fields.deviceModel !== undefined) clamped.deviceModel = clamp(fields.deviceModel);
  return clamped;
}


function clamp(value: string): string {
  return value.length > MAX_DEVICE_CHARS ? value.slice(0, MAX_DEVICE_CHARS) : value;
}
