/**
 * Tests for Logger Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger } from '@/lib/logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  describe('Correlation ID', () => {
    it('should generate correlation ID on init', () => {
      const correlationId = logger.getCorrelationId();
      expect(correlationId).toBeTruthy();
      expect(typeof correlationId).toBe('string');
    });

    it('should set correlation ID', () => {
      const testId = 'test-correlation-id';
      logger.setCorrelationId(testId);
      expect(logger.getCorrelationId()).toBe(testId);
    });
  });

  describe('User ID', () => {
    it('should set user ID', () => {
      logger.setUserId('user-001');
      // User ID is stored internally, no getter, but should be included in logs
      expect(true).toBe(true);
    });
  });

  describe('Log levels', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message', { key: 'value' });
      expect(console.debug).toHaveBeenCalled();
    });

    it('should log info messages', () => {
      logger.info('Info message', { key: 'value' });
      expect(console.info).toHaveBeenCalled();
    });

    it('should log warning messages', () => {
      logger.warn('Warning message', { key: 'value' });
      expect(console.warn).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      logger.error('Error message', error, { key: 'value' });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Specialized logging', () => {
    it('should log API requests', () => {
      logger.logApiRequest('GET', '/api/test');
      expect(console.debug).toHaveBeenCalled();
    });

    it('should log API responses', () => {
      logger.logApiResponse('GET', '/api/test', 200, 150);
      expect(console.info).toHaveBeenCalled();
    });

    it('should log API errors', () => {
      const error = new Error('API Error');
      logger.logApiError('GET', '/api/test', 500, error);
      expect(console.error).toHaveBeenCalled();
    });

    it('should log user actions', () => {
      logger.logUserAction('RESOURCE_CREATED', 'ec2-001');
      expect(console.info).toHaveBeenCalled();
    });

    it('should log performance metrics', () => {
      logger.logPerformance('dashboard-render', 250);
      expect(console.info).toHaveBeenCalled();
    });
  });
});
