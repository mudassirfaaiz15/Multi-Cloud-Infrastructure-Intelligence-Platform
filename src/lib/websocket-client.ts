/**
 * WebSocket Client for Real-Time Infrastructure Updates
 * Handles connection management, reconnection, and event subscriptions
 */

import { io, Socket } from 'socket.io-client';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface ResourceUpdate {
  resource_id: string;
  resource_type: string;
  status: string;
  region: string;
  updated_at: string;
}

export interface CostUpdate {
  account_id: string;
  current_cost: number;
  previous_cost: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  updated_at: string;
}

export interface AnomalyAlert {
  anomaly_id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  detected_at: string;
}

export interface SecurityAlert {
  finding_id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  resource_id: string;
  created_at: string;
}

class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnected = false;

  constructor(private url: string = import.meta.env.VITE_API_URL || 'http://localhost:5000') {}

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.url, {
          reconnection: true,
          reconnectionDelay: this.reconnectDelay,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: this.maxReconnectAttempts,
          transports: ['websocket', 'polling'],
          autoConnect: true,
        });

        this.socket.on('connect', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('[WebSocket] Connected to server');
          this.startHeartbeat();
          resolve();
        });

        this.socket.on('connection_established', (data) => {
          console.log('[WebSocket] Connection established:', data);
          this.emit('connection_established', data);
        });

        this.socket.on('disconnect', () => {
          this.isConnected = false;
          console.log('[WebSocket] Disconnected from server');
          this.stopHeartbeat();
          this.emit('disconnected', {});
        });

        this.socket.on('error', (error) => {
          console.error('[WebSocket] Error:', error);
          this.emit('error', { error });
        });

        this.socket.on('pong', (data) => {
          console.log('[WebSocket] Pong received:', data);
        });

        // Register event listeners
        this.registerEventListeners();

        // Set timeout for connection
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 5000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  /**
   * Subscribe to resource updates
   */
  subscribeToResourceUpdates(): void {
    if (this.socket) {
      this.socket.emit('subscribe_resource_updates', {});
    }
  }

  /**
   * Subscribe to cost updates
   */
  subscribeToCoastUpdates(): void {
    if (this.socket) {
      this.socket.emit('subscribe_cost_updates', {});
    }
  }

  /**
   * Subscribe to anomaly alerts
   */
  subscribeToAnomalies(): void {
    if (this.socket) {
      this.socket.emit('subscribe_anomalies', {});
    }
  }

  /**
   * Subscribe to security alerts
   */
  subscribeToSecurityAlerts(): void {
    if (this.socket) {
      this.socket.emit('subscribe_security', {});
    }
  }

  /**
   * Register event listeners for real-time updates
   */
  private registerEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('resource_update', (data: ResourceUpdate) => {
      console.log('[WebSocket] Resource update:', data);
      this.emit('resource_update', data);
    });

    this.socket.on('cost_update', (data: CostUpdate) => {
      console.log('[WebSocket] Cost update:', data);
      this.emit('cost_update', data);
    });

    this.socket.on('anomaly_alert', (data: AnomalyAlert) => {
      console.log('[WebSocket] Anomaly alert:', data);
      this.emit('anomaly_alert', data);
    });

    this.socket.on('security_alert', (data: SecurityAlert) => {
      console.log('[WebSocket] Security alert:', data);
      this.emit('security_alert', data);
    });

    this.socket.on('activity_log', (data: any) => {
      console.log('[WebSocket] Activity log:', data);
      this.emit('activity_log', data);
    });

    this.socket.on('ai_message', (data: any) => {
      console.log('[WebSocket] AI message:', data);
      this.emit('ai_message', data);
    });

    this.socket.on('subscribed', (data: any) => {
      console.log('[WebSocket] Subscribed to:', data.channel);
      this.emit('subscribed', data);
    });
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('ping');
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Register event listener
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unregister event listener
   */
  off(event: string, callback: (data: any) => void): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WebSocket] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Check if connected
   */
  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection status
   */
  getStatus(): 'connected' | 'disconnected' | 'connecting' {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    if (this.socket.connecting) return 'connecting';
    return 'disconnected';
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient();
  }
  return wsClient;
}

export function createWebSocketClient(url?: string): WebSocketClient {
  wsClient = new WebSocketClient(url);
  return wsClient;
}

export default WebSocketClient;
