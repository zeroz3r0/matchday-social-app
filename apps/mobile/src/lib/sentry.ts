// ============================================================================
// Sentry — Mobile crash reporting
// ----------------------------------------------------------------------------
// Init no-ops cuando no hay DSN (REQ-MS-1). React Navigation instrumentation
// se expone como integration moderna `reactNavigationIntegration()` —
// `App.tsx` debe llamar `registerNavigationContainer(ref)` para emitir
// breadcrumbs de navegación (REQ-MS-4).
// ============================================================================

import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: false,
});

export function initSentry(): void {
  if (!DSN) {
    return;
  }

  Sentry.init({
    dsn: DSN,
    tracesSampleRate: __DEV__ ? 1.0 : 0.5,
    enableNative: true,
    integrations: [navigationIntegration],
  });
}

export const captureException = Sentry.captureException;
export const setUser = Sentry.setUser;
export const addBreadcrumb = Sentry.addBreadcrumb;
export { navigationIntegration };
export { Sentry };
