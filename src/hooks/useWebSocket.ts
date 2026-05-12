/**
 * React Hook for WebSocket Integration
 * Manages connection lifecycle and event subscriptions
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { getWebSocketClient, type ResourceUpdate, type CostUpdate, type AnomalyAlert, type SecurityAlert } from '@/lib/websocket-client';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  subscribeToResources?: boolean;
  subscribeToCosts?: boolean;
  subscribeToAnomalies?: boolean;
  subscribeToSecurity?: boolean;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  status: 'connected' | 'disconnected' | 'connecting';
  onResourceUpdate: (callback: (data: ResourceUpdate) => void) => void;
  onCostUpdate: (callback: (data: CostUpdate) => void) => void;
  onAnomalyAlert: (callback: (data: AnomalyAlert) => void) => void;
  onSecurityAlert: (callback: (data: SecurityAlert) => void) => void;
  onActivityLog: (callback: (data: any) => void) => void;
  onAIMessage: (callback: (data: any) => void) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    subscribeToResources = true,
    subscribeToCosts = true,
    subscribeToAnomalies = true,
    subscribeToSecurity = true,
  } = options;

  const wsClientRef = useRef(getWebSocketClient());
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const callbacksRef = useRef<Map<string, Set<Function>>>(new Map());

  // Initialize connection on mount
  useEffect(() => {
    const wsClient = wsClientRef.current;

    const handleConnectionEstablished = () => {
      setIsConnected(true);
      setStatus('connected');

      // Subscribe to channels
      if (subscribeToResources) wsClient.subscribeToResourceUpdates();
      if (subscribeToCosts) wsClient.subscribeToCoastUpdates();
      if (subscribeToAnomalies) wsClient.subscribeToAnomalies();
      if (subscribeToSecurity) wsClient.subscribeToSecurityAlerts();
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setStatus('disconnected');
    };

    const handleError = (error: any) => {
      console.error('[useWebSocket] Error:', error);
      setStatus('disconnected');
    };

    // Register connection listeners
    wsClient.on('connection_established', handleConnectionEstablished);
    wsClient.on('disconnected', handleDisconnected);
    wsClient.on('error', handleError);

    // Auto-connect if enabled
    if (autoConnect && !wsClient.isConnectedToServer()) {
      setStatus('connecting');
      wsClient.connect().catch((error) => {
        console.error('[useWebSocket] Connection failed:', error);
        setStatus('disconnected');
      });
    }

    // Cleanup on unmount
    return () => {
      wsClient.off('connection_established', handleConnectionEstablished);
      wsClient.off('disconnected', handleDisconnected);
      wsClient.off('error', handleError);
    };
  }, [autoConnect, subscribeToResources, subscribeToCosts, subscribeToAnomalies, subscribeToSecurity]);

  // Register event listener
  const registerListener = useCallback((event: string, callback: Function) => {
    const wsClient = wsClientRef.current;

    if (!callbacksRef.current.has(event)) {
      callbacksRef.current.set(event, new Set());

      // Register with WebSocket client once
      wsClient.on(event, (data) => {
        const callbacks = callbacksRef.current.get(event);
        if (callbacks) {
          callbacks.forEach((cb) => {
            try {
              cb(data);
            } catch (error) {
              console.error(`[useWebSocket] Error in ${event} callback:`, error);
            }
          });
        }
      });
    }

    callbacksRef.current.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      callbacksRef.current.get(event)?.delete(callback);
    };
  }, []);

  const connect = useCallback(async () => {
    const wsClient = wsClientRef.current;
    if (!wsClient.isConnectedToServer()) {
      setStatus('connecting');
      try {
        await wsClient.connect();
        setIsConnected(true);
        setStatus('connected');
      } catch (error) {
        console.error('[useWebSocket] Connection failed:', error);
        setStatus('disconnected');
        throw error;
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    const wsClient = wsClientRef.current;
    wsClient.disconnect();
    setIsConnected(false);
    setStatus('disconnected');
  }, []);

  return {
    isConnected,
    status,
    onResourceUpdate: (callback) => registerListener('resource_update', callback),
    onCostUpdate: (callback) => registerListener('cost_update', callback),
    onAnomalyAlert: (callback) => registerListener('anomaly_alert', callback),
    onSecurityAlert: (callback) => registerListener('security_alert', callback),
    onActivityLog: (callback) => registerListener('activity_log', callback),
    onAIMessage: (callback) => registerListener('ai_message', callback),
    connect,
    disconnect,
  };
}

export default useWebSocket;
