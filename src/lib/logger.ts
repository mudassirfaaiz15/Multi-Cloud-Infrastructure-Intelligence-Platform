/**
 * Structured Logging Service
 * Provides consistent logging across the application with correlation IDs
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  userId?: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

class Logger {
  private correlationId: string = '';
  private userId: string = '';
  private isDevelopment = import.meta.env.DEV;

  constructor() {
    this.generateCorrelationId();
  }

  /**
   * Generate or set correlation ID
   */
  private generateCorrelationId(): void {
    this.correlationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set correlation ID
   */
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  /**
   * Get correlation ID
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Set user ID for logging context
   */
  setUserId(id: string): void {
    this.userId = id;
  }

  /**
   * Create log entry
   */
  private createLogEntry(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: this.correlationId,
      userId: this.userId || undefined,
      context,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            code: (error as any).code,
          }
        : undefined,
    };
  }

  /**
   * Format log entry for console
   */
  private formatForConsole(entry: LogEntry): string[] {
    const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp}`;
    const correlation = entry.correlationId ? ` [${entry.correlationId}]` : '';
    const user = entry.userId ? ` [user: ${entry.userId}]` : '';

    const args = [`${prefix}${correlation}${user} ${entry.message}`];

    if (entry.context && Object.keys(entry.context).length > 0) {
      args.push(entry.context);
    }

    if (entry.error) {
      args.push(entry.error);
    }

    return args;
  }

  /**
   * Send log to backend
   */
  private async sendToBackend(entry: LogEntry): Promise<void> {
    if (!this.isDevelopment) {
      try {
        await fetch('/api/v1/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
      } catch (error) {
        console.error('Failed to send log to backend:', error);
      }
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry('debug', message, context);
    if (this.isDevelopment) {
      console.debug(...this.formatForConsole(entry));
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry('info', message, context);
    console.info(...this.formatForConsole(entry));
    this.sendToBackend(entry);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry('warn', message, context);
    console.warn(...this.formatForConsole(entry));
    this.sendToBackend(entry);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    const entry = this.createLogEntry('error', message, context, error);
    console.error(...this.formatForConsole(entry));
    this.sendToBackend(entry);
  }

  /**
   * Log API request
   */
  logApiRequest(method: string, url: string, context?: Record<string, any>): void {
    this.debug(`API Request: ${method} ${url}`, context);
  }

  /**
   * Log API response
   */
  logApiResponse(method: string, url: string, status: number, duration: number, context?: Record<string, any>): void {
    this.info(`API Response: ${method} ${url} ${status} (${duration}ms)`, context);
  }

  /**
   * Log API error
   */
  logApiError(method: string, url: string, status: number, error: Error, context?: Record<string, any>): void {
    this.error(`API Error: ${method} ${url} ${status}`, error, context);
  }

  /**
   * Log user action
   */
  logUserAction(action: string, resource?: string, context?: Record<string, any>): void {
    this.info(`User Action: ${action}${resource ? ` on ${resource}` : ''}`, context);
  }

  /**
   * Log performance metric
   */
  logPerformance(metric: string, duration: number, context?: Record<string, any>): void {
    this.info(`Performance: ${metric} took ${duration}ms`, context);
  }
}

// Singleton instance
export const logger = new Logger();

export default logger;
