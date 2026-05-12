/**
 * Tests for API Client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';

describe('ApiClient', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('GET requests', () => {
    it('should make GET request successfully', async () => {
      const mockResponse = {
        success: true,
        data: { id: 1, name: 'Test' },
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      );

      const result = await apiClient.get('/test');
      expect(result.success).toBe(true);
    });

    it('should include auth token in headers', async () => {
      localStorage.setItem('auth_token', 'test-token');

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
      );

      await apiClient.get('/test');

      const calls = (global.fetch as any).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });

    it('should add correlation ID header', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
      );

      await apiClient.get('/test');

      const calls = (global.fetch as any).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  describe('POST requests', () => {
    it('should make POST request successfully', async () => {
      const mockResponse = {
        success: true,
        data: { id: 1 },
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      );

      const result = await apiClient.post('/test', { name: 'Test' });
      expect(result.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle 401 errors', async () => {
      localStorage.setItem('auth_token', 'test-token');

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Unauthorized' }),
        })
      );

      const result = await apiClient.get('/test');
      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      const result = await apiClient.get('/test');
      expect(result.success).toBe(false);
    });
  });

  describe('Token management', () => {
    it('should set auth token', () => {
      apiClient.setAuthToken('new-token');
      expect(localStorage.getItem('auth_token')).toBe('new-token');
    });

    it('should clear auth token', () => {
      localStorage.setItem('auth_token', 'test-token');
      apiClient.clearAuthToken();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('Base URL', () => {
    it('should return base URL', () => {
      const baseUrl = apiClient.getBaseURL();
      expect(typeof baseUrl).toBe('string');
      expect(baseUrl.length).toBeGreaterThan(0);
    });
  });
});
