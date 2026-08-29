import { captureDevice } from './captureDevice';
import type { DeviceContext } from './deviceContext';
import { settledWithin } from './settledWithin';

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
  return settledWithin(capture, waitMs, NOTHING);
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
