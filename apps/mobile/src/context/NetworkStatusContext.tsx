// ============================================================================
// NetworkStatusContext — NetInfo subscription with 300ms debounce
// ----------------------------------------------------------------------------
// REQ-NW-2: state subscribed at App.tsx level. Banner + form-disable consume
// the same hook (`useNetworkStatus()`). Flapping debounced 300ms via
// setTimeout cleared on each new event.
// ============================================================================

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

type NetworkStatus = {
  isConnected: boolean;
};

const NetworkStatusContext = createContext<NetworkStatus | null>(null);

const DEBOUNCE_MS = 300;

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  // Asume conectado al arrancar — primer evento de NetInfo corrige
  const [isConnected, setIsConnected] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const apply = (next: boolean) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsConnected(next);
        timerRef.current = null;
      }, DEBOUNCE_MS);
    };

    const handle = (state: NetInfoState) => {
      // `isInternetReachable` puede ser null al boot; tratamos null como connected
      const connected = state.isConnected !== false && state.isInternetReachable !== false;
      apply(connected);
    };

    const unsubscribe = NetInfo.addEventListener(handle);

    // Fetch inicial sin debounce para no mostrar banner falso al arrancar offline
    NetInfo.fetch().then((state) => {
      const connected = state.isConnected !== false && state.isInternetReachable !== false;
      setIsConnected(connected);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <NetworkStatusContext.Provider value={{ isConnected }}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus(): NetworkStatus {
  const ctx = useContext(NetworkStatusContext);
  if (!ctx) {
    // Defensive default — si un screen se monta sin provider devolvemos online
    // para no bloquear submits accidentalmente.
    return { isConnected: true };
  }
  return ctx;
}
