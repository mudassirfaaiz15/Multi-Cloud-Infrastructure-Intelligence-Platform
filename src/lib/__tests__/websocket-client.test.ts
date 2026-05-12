/**
 * Tests for WebSocket Client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getWebSocketClient, createWebSocketClient } from '@/lib/websocket-client';

describe('WebSocketClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton pattern', () => {
    it('should return same instance on multiple calls', () => {
      const client1 = getWebSocketClient();
      const client2 = getWebSocketClient();
      expect(client1).toBe(client2);
    });

    it('should create new instance with createWebSocketClient', () => {
      const client = createWebSocketClient();
      expect(client).toBeTruthy();
    });
  });

  describe('Connection status', () => {
    it('should start as disconnected', () => {
      const client = createWebSocketClient();
      expect(client.getStatus()).toBe('disconnected');
      expect(client.isConnectedToServer()).toBe(false);
    });
  });

  describe('Event listeners', () => {
    it('should register event listener', () => {
      const client = createWebSocketClient();
      const callback = vi.fn();

      client.on('test_event', callback);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should unregister event listener', () => {
      const client = createWebSocketClient();
      const callback = vi.fn();

      client.on('test_event', callback);
      client.off('test_event', callback);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Subscription methods', () => {
    it('should have subscribeToResourceUpdates method', () => {
      const client = createWebSocketClient();
      expect(typeof client.subscribeToResourceUpdates).toBe('function');
    });

    it('should have subscribeToCoastUpdates method', () => {
      const client = createWebSocketClient();
      expect(typeof client.subscribeToCoastUpdates).toBe('function');
    });

    it('should have subscribeToAnomalies method', () => {
      const client = createWebSocketClient();
      expect(typeof client.subscribeToAnomalies).toBe('function');
    });

    it('should have subscribeToSecurityAlerts method', () => {
      const client = createWebSocketClient();
      expect(typeof client.subscribeToSecurityAlerts).toBe('function');
    });
  });

  describe('Connection lifecycle', () => {
    it('should have connect method', () => {
      const client = createWebSocketClient();
      expect(typeof client.connect).toBe('function');
    });

    it('should have disconnect method', () => {
      const client = createWebSocketClient();
      expect(typeof client.disconnect).toBe('function');
    });
  });
});
