import {
  webDeviceContext,
  type ClientHints,
  type DeviceContext,
  type WebSignals,
} from './deviceContext';

export const HINTS_TIMEOUT_MS = 1000;

export const HIGH_ENTROPY_HINTS = ['platformVersion', 'model'];

type UserAgentDataLike = {
  readonly brands?: unknown;
  readonly platform?: unknown;
  getHighEntropyValues?: (hints: string[]) => Promise<Record<string, unknown>>;
};

type NavigatorLike = {
  readonly userAgent?: unknown;
  readonly maxTouchPoints?: unknown;
  readonly userAgentData?: UserAgentDataLike;
};


export async function captureDevice(): Promise<DeviceContext> {
  const signals = await readWebSignals((globalThis as { navigator?: unknown }).navigator);
  return signals === null ? {} : webDeviceContext(signals);
}


export async function readWebSignals(
  navigator: unknown,
  timeoutMs: number = HINTS_TIMEOUT_MS,
): Promise<WebSignals | null> {
  const source = safe(() => navigator as NavigatorLike | null | undefined);
  if (source === undefined || source === null) return null;

  const userAgent = safe(() => source.userAgent);
  const maxTouchPoints = safe(() => source.maxTouchPoints);
  const data = safe(() => source.userAgentData);

  return {
    userAgent: typeof userAgent === 'string' ? userAgent : '',
    maxTouchPoints: typeof maxTouchPoints === 'number' ? maxTouchPoints : 0,
    hints: await hintsOf(data, timeoutMs),
  };
}


async function hintsOf(
  data: UserAgentDataLike | undefined,
  timeoutMs: number,
): Promise<ClientHints | undefined> {
  if (data === undefined || data === null) return undefined;
  const shallow = shallowHints(data);
  if (typeof data.getHighEntropyValues !== 'function') return shallow;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const answered = await Promise.race([
      data.getHighEntropyValues([...HIGH_ENTROPY_HINTS]),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
    return answered === null || answered === undefined
      ? shallow
      : { ...shallow, ...deepHints(answered) };
  } catch {
    return shallow;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}


function shallowHints(data: UserAgentDataLike): ClientHints {
  const brands = safe(() => data.brands);
  const platform = safe(() => data.platform);
  return {
    brands: Array.isArray(brands) ? brands : undefined,
    platform: typeof platform === 'string' ? platform : undefined,
  };
}


function deepHints(answered: Record<string, unknown>): ClientHints {
  const platformVersion = safe(() => answered.platformVersion);
  const model = safe(() => answered.model);
  return {
    platformVersion: typeof platformVersion === 'string' ? platformVersion : undefined,
    model: typeof model === 'string' ? model : undefined,
  };
}


function safe<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}
