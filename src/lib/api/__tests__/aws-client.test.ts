import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { AWSAPIClient } from '../aws-client';

vi.mock('axios');

describe('AWSAPIClient', () => {
  let client: AWSAPIClient;

  beforeEach(() => {
    client = new AWSAPIClient('http://localhost:5000');
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should set tokens correctly', () => {
      const accessToken = 'test-access-token';
      const refreshToken = 'test-refresh-token';

      client.setTokens(accessToken, refreshToken);

      expect(client.isAuthenticated()).toBe(true);
    });

    it('should clear tokens', () => {
      client.setTokens('access', 'refresh');
      expect(client.isAuthenticated()).toBe(true);

      client.clearTokens();
      expect(client.isAuthenticated()).toBe(false);
    });

    it('should store tokens in localStorage', () => {
      const accessToken = 'test-access';
      const refreshToken = 'test-refresh';

      client.setTokens(accessToken, refreshToken);

      expect(localStorage.getItem('access_token')).toBe(accessToken);
      expect(localStorage.getItem('refresh_token')).toBe(refreshToken);
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 unauthorized error', () => {
      const error = {
        response: {
          status: 401,
          data: { error: 'Unauthorized' },
        },
      };

      const message = client.getErrorMessage(error as any);
      expect(message).toContain('authentication required');
    });

    it('should handle network errors', () => {
      const error = new Error('Network error');

      const message = client.getErrorMessage(error as any);
      expect(message).toContain('Network');
    });
  });

  describe('API Methods', () => {
    it('should have login method', () => {
      expect(client.login).toBeDefined();
      expect(typeof client.login).toBe('function');
    });

    it('should have getProfile method', () => {
      expect(client.getProfile).toBeDefined();
      expect(typeof client.getProfile).toBe('function');
    });

    it('should have EC2 methods', () => {
      expect(client.getEC2Instances).toBeDefined();
      expect(typeof client.getEC2Instances).toBe('function');
    });

    it('should have Lambda methods', () => {
      expect(client.getLambdaFunctions).toBeDefined();
      expect(typeof client.getLambdaFunctions).toBe('function');
    });

    it('should have S3 methods', () => {
      expect(client.getS3Buckets).toBeDefined();
      expect(typeof client.getS3Buckets).toBe('function');
    });
  });
});
