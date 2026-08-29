import { Platform } from 'react-native';

import { nativeDeviceContext, type DeviceContext } from './deviceContext';


export async function captureDevice(): Promise<DeviceContext> {
  try {
    const constants = Platform.constants as unknown as Record<string, unknown> | undefined;
    return nativeDeviceContext({
      os: Platform.OS === 'ios' ? 'ios' : 'android',
      release: Platform.OS === 'ios' ? constants?.osVersion : constants?.Release,
      model: constants?.Model,
      systemName: constants?.systemName,
    });
  } catch {
    return {};
  }
}
