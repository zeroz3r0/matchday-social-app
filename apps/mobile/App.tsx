import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { initSentry, Sentry } from './src/lib/sentry';
import { ErrorBoundaryFallback } from './src/components/ErrorBoundaryFallback';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

// Init Sentry ANTES del primer render (REQ-MS-2)
initSentry();

export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={ErrorBoundaryFallback}>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </Sentry.ErrorBoundary>
  );
}
