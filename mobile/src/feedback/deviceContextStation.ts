import { captureDevice } from './captureDevice';
import type { DeviceContext } from './deviceContext';

export const SUBMIT_WAIT_MS = 1500;

const NOTHING: DeviceContext = {};

let pending: Promise<DeviceContext> | null = null;
let settled: DeviceContext | null = null;


export function warmDeviceContext(): void {
  void capture();
}


export async function deviceContextForReport(
  waitMs: number = SUBMIT_WAIT_MS,
): Promise<DeviceContext> {
  if (settled !== null) return settled;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const answer = await Promise.race([
      capture(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), waitMs);
      }),
    ]);
    return answer ?? NOTHING;
  } catch {
    return NOTHING;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}


export function resetDeviceContextForTests(): void {
  pending = null;
  settled = null;
}


function capture(): Promise<DeviceContext> {
  if (pending === null) {
    pending = started()
      .catch(() => NOTHING)
      .then((context) => {
        settled = context ?? NOTHING;
        return settled;
      });
  }
  return pending;
}


function started(): Promise<DeviceContext> {
  try {
    return Promise.resolve(captureDevice());
  } catch {
    return Promise.resolve(NOTHING);
  }
}
