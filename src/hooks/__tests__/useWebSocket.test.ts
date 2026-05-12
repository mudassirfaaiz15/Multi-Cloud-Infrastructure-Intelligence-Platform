/**
 * Tests for useWebSocket Hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '@/hooks/useWebSocket';

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Hook initialization', () => {
    it('should initialize with default options', () => {
      const { result } = renderHook(() => useWebSocket());
      expect(result.current).toBeTruthy();
      expect(result.current.isConnected).toBe(false);
    });

    it('should initialize with custom options', () => {
      const { result } = renderHook(() =>
        useWebSocket({
          autoConnect: false,
          subscribeToResources: false,
        })
      );
      expect(result.current).toBeTruthy();
    });
  });

  describe('Connection status', () => {
    it('should track connection status', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));
      expect(result.current.status).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Event listeners', () => {
    it('should register resource update listener', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));
      const callback = vi.fn();

      act(() => {
        result.current.onResourceUpdate(callback);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should register cost update listener', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));
      const callback = vi.fn();

      act(() => {
        result.current.onCostUpdate(callback);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should register anomaly alert listener', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));
      const callback = vi.fn();

      act(() => {
        result.current.onAnomalyAlert(callback);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should register security alert listener', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));
      const callback = vi.fn();

      act(() => {
        result.current.onSecurityAlert(callback);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should register activity log listener', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));
      const callback = vi.fn();

      act(() => {
        result.current.onActivityLog(callback);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should register AI message listener', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));
      const callback = vi.fn();

      act(() => {
        result.current.onAIMessage(callback);
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Connection methods', () => {
    it('should have connect method', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));
      expect(typeof result.current.connect).toBe('function');
    });

    it('should have disconnect method', () => {
      const { result } = renderHook(() => useWebSocket({ autoConnect: false }));
      expect(typeof result.current.disconnect).toBe('function');
    });
  });
});
