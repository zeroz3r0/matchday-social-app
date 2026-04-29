// ============================================================================
// Notifications — Expo Push token helper
// ----------------------------------------------------------------------------
// Wraps permission prompt + Expo push token retrieval. Gates simulators via
// `Device.isDevice` (Expo Push tokens require physical hardware). All errors
// captured via Sentry. Caller decides what to do per status (register / skip).
// ============================================================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { captureException } from './sentry';

export type ExpoPushPlatform = 'ios' | 'android' | 'web';

export type ExpoPushTokenResult =
  | { status: 'ok'; token: string; platform: ExpoPushPlatform }
  | { status: 'simulator' }
  | { status: 'denied' }
  | { status: 'error'; error: unknown };

export async function getExpoPushToken(projectId: string): Promise<ExpoPushTokenResult> {
  if (!Device.isDevice) {
    return { status: 'simulator' };
  }

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status: requested } = await Notifications.requestPermissionsAsync();
      final = requested;
    }
    if (final !== 'granted') {
      return { status: 'denied' };
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const platform: ExpoPushPlatform =
      Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web'
        ? Platform.OS
        : 'web';
    return { status: 'ok', token, platform };
  } catch (err) {
    captureException(err);
    return { status: 'error', error: err };
  }
}
