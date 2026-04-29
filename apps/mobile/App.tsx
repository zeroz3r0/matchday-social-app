import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { initSentry, Sentry } from './src/lib/sentry';
import { ErrorBoundaryFallback } from './src/components/ErrorBoundaryFallback';
import { AuthProvider } from './src/context/AuthContext';
import { NetworkStatusProvider } from './src/context/NetworkStatusContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/RootNavigator';

// Init Sentry ANTES del primer render (REQ-MS-2)
initSentry();

// Foreground notification presentation (REQ Mobile Push F.7).
// All categories: show alert + play sound + bump badge. Per-category override
// is a future iteration (e.g., chat-typing notifs without sound).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  // Tap-routing: when user taps a push, route to the screen encoded in
  // `data.{route, params}`. Uses module-level navigationRef so this works
  // even if the app was launched from a killed state via the notification.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { route?: string; params?: Record<string, unknown> }
        | null
        | undefined;
      if (data?.route && navigationRef.isReady()) {
        // Type-erase to navigate by string name — RootNavigator declares
        // routes per-stack; runtime guarantees match the route key sent by
        // the backend trigger sites (MatchDetail / Voting / etc.).
        const navAny = navigationRef as unknown as {
          navigate: (name: string, params?: Record<string, unknown>) => void;
        };
        navAny.navigate(data.route, data.params);
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <Sentry.ErrorBoundary fallback={ErrorBoundaryFallback}>
      <NetworkStatusProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </NetworkStatusProvider>
    </Sentry.ErrorBoundary>
  );
}
