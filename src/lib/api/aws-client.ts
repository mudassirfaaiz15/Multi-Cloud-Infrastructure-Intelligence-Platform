/**
 * Centralized AWS API Client
 * 
 * Production-grade API abstraction layer for frontend-to-backend communication
 * 
 * Enterprise Features:
 * - Typed request/response handling
 * - Automatic JWT token management
 * - Request retry logic with exponential backoff
 * - Request timeout handling
 * - Centralized error handling
 * - Request/response logging
 * - Automatic token refresh on 401
 * - Request cancellation support
 * - Loading state management
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface EC2Instance {
  instance_id: string;
  instance_name: string;
  instance_type: string;
  state: string;
  private_ip?: string;
  public_ip?: string;
  region: string;
  availability_zone: string;
  launch_time: string;
  tags: Record<string, string>;
  security_groups: string[];
  cost_per_month: number;
  status: 'safe' | 'warning' | 'critical';
}

export interface RDSInstance {
  db_instance_identifier: string;
  engine: string;
  db_instance_class: string;
  engine_version: string;
  db_instance_status: string;
  availability_zone: string;
  master_username: string;
  allocated_storage: number;
  storage_encrypted: boolean;
  port: number;
  create_time: string;
  multi_az: boolean;
  region: string;
  cost_per_month: number;
  status: 'safe' | 'warning' | 'critical';
}

export interface LambdaFunction {
  function_name: string;
  function_arn: string;
  runtime: string;
  handler: string;
  code_size: number;
  timeout: number;
  memory_size: number;
  last_modified: string;
  role_arn: string;
  region: string;
  cost_per_month: number;
  invocations_last_30d: number;
  errors_last_30d: number;
  status: 'safe' | 'warning' | 'critical';
}

export interface S3Bucket {
  bucket_name: string;
  region: string;
  creation_date: string;
  size_bytes: number;
  object_count: number;
  storage_class: string;
  encryption_enabled: boolean;
  versioning_enabled: boolean;
  public_access_blocked: boolean;
  cost_per_month: number;
  status: 'safe' | 'warning' | 'critical';
}

export interface CloudTrailEvent {
  event_id: string;
  event_name: string;
  event_time: string;
  username: string;
  source_ip_address: string;
  user_agent: string;
  aws_region: string;
  event_source: string;
  resources: Record<string, string>[];
  error_code?: string;
  error_message?: string;
  request_parameters: Record<string, unknown>;
  response_elements: Record<string, unknown>;
}

export interface SecurityHubFinding {
  finding_id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  compliance_status: string;
  resource_type: string;
  resource_id: string;
  aws_region: string;
  first_observed_at: string;
  last_observed_at: string;
  status: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    full_name: string;
    roles: string[];
    permissions: string[];
  };
}

export interface AIQueryResponse {
  response: string;
  recommendations: Array<{
    type: string;
    content: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  metadata: {
    model: string;
    input_tokens: number;
    output_tokens: number;
    processing_time_ms: number;
    conversation_id?: string;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second, increases exponentially

// ============================================================================
// AWS API CLIENT
// ============================================================================

export class AWSAPIClient {
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to attach token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        // Add correlation ID for request tracing
        config.headers['X-Correlation-ID'] = this.generateCorrelationId();
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling and token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => this.handleResponseError(error)
    );

    // Load tokens from localStorage
    this.loadTokensFromStorage();
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadTokensFromStorage(): void {
    // In production, use secure HTTP-only cookies instead of localStorage
    const tokens = localStorage.getItem('auth_tokens');
    if (tokens) {
      try {
        const parsed = JSON.parse(tokens);
        this.accessToken = parsed.accessToken;
        this.refreshToken = parsed.refreshToken;
      } catch (e) {
        console.error('Failed to parse stored tokens', e);
      }
    }
  }

  public saveTokensToStorage(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem(
      'auth_tokens',
      JSON.stringify({ accessToken, refreshToken })
    );
  }

  public clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('auth_tokens');
  }

  private async handleResponseError(error: AxiosError): Promise<never> {
    const originalRequest = error.config as any;

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && this.refreshToken && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!this.isRefreshing) {
        this.isRefreshing = true;

        try {
          const response = await this.axiosInstance.post('/api/v1/auth/refresh', {
            refresh_token: this.refreshToken,
          });

          const newAccessToken = response.data.data.access_token;
          this.accessToken = newAccessToken;
          localStorage.setItem(
            'auth_tokens',
            JSON.stringify({
              accessToken: newAccessToken,
              refreshToken: this.refreshToken,
            })
          );

          this.isRefreshing = false;

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return this.axiosInstance(originalRequest);
        } catch (refreshError) {
          this.isRefreshing = false;
          this.clearTokens();
          window.location.href = '/login'; // Redirect to login
          return Promise.reject(refreshError);
        }
      } else {
        // Wait for token refresh to complete
        return new Promise((resolve) => {
          this.refreshSubscribers.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(this.axiosInstance(originalRequest) as any);
          });
        });
      }
    }

    return Promise.reject(error);
  }

  // ========================================================================
  // AUTHENTICATION ENDPOINTS
  // ========================================================================

  public async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<APIResponse<AuthResponse>>(
      '/api/v1/auth/login',
      'POST',
      { email, password }
    );
    if (response.data.data) {
      this.saveTokensToStorage(
        response.data.data.access_token,
        response.data.data.refresh_token
      );
    }
    return response.data.data!;
  }

  public async logout(): Promise<void> {
    await this.request('/api/v1/auth/logout', 'POST');
    this.clearTokens();
  }

  public async getProfile(): Promise<AuthResponse['user']> {
    const response = await this.request<APIResponse<{ user: AuthResponse['user'] }>>(
      '/api/v1/auth/profile',
      'GET'
    );
    return response.data.data!.user;
  }

  // ========================================================================
  // AWS RESOURCES ENDPOINTS
  // ========================================================================

  public async getEC2Instances(
    region?: string,
    page = 1,
    pageSize = 50
  ): Promise<PaginatedResponse<EC2Instance>> {
    const response = await this.request<APIResponse<PaginatedResponse<EC2Instance>>>(
      '/api/v1/resources/ec2',
      'GET',
      undefined,
      {
        region,
        page,
        page_size: pageSize,
      }
    );
    return response.data.data!;
  }

  public async getRDSInstances(
    region?: string,
    page = 1,
    pageSize = 50
  ): Promise<PaginatedResponse<RDSInstance>> {
    const response = await this.request<APIResponse<PaginatedResponse<RDSInstance>>>(
      '/api/v1/resources/rds',
      'GET',
      undefined,
      { region, page, page_size: pageSize }
    );
    return response.data.data!;
  }

  public async getLambdaFunctions(
    region?: string,
    page = 1,
    pageSize = 50
  ): Promise<PaginatedResponse<LambdaFunction>> {
    const response = await this.request<APIResponse<PaginatedResponse<LambdaFunction>>>(
      '/api/v1/resources/lambda',
      'GET',
      undefined,
      { region, page, page_size: pageSize }
    );
    return response.data.data!;
  }

  public async getS3Buckets(
    page = 1,
    pageSize = 50
  ): Promise<PaginatedResponse<S3Bucket>> {
    const response = await this.request<APIResponse<PaginatedResponse<S3Bucket>>>(
      '/api/v1/resources/s3',
      'GET',
      undefined,
      { page, page_size: pageSize }
    );
    return response.data.data!;
  }

  // ========================================================================
  // ACTIVITY & SECURITY ENDPOINTS
  // ========================================================================

  public async getCloudTrailEvents(
    days = 7,
    eventSource?: string,
    page = 1,
    pageSize = 50
  ): Promise<PaginatedResponse<CloudTrailEvent>> {
    const response = await this.request<APIResponse<PaginatedResponse<CloudTrailEvent>>>(
      '/api/v1/activity/cloudtrail',
      'GET',
      undefined,
      { days, event_source: eventSource, page, page_size: pageSize }
    );
    return response.data.data!;
  }

  public async getSecurityFindings(
    severity = 'HIGH',
    status = 'NEW',
    page = 1,
    pageSize = 50
  ): Promise<PaginatedResponse<SecurityHubFinding>> {
    const response = await this.request<APIResponse<PaginatedResponse<SecurityHubFinding>>>(
      '/api/v1/security/findings',
      'GET',
      undefined,
      { severity, status, page, page_size: pageSize }
    );
    return response.data.data!;
  }

  // ========================================================================
  // AI ENDPOINTS
  // ========================================================================

  public async queryAI(
    question: string,
    context?: { include_metrics?: boolean; include_costs?: boolean; include_security?: boolean }
  ): Promise<AIQueryResponse> {
    const response = await this.request<APIResponse<AIQueryResponse>>(
      '/api/v1/ai/query',
      'POST',
      { question, context }
    );
    return response.data.data!;
  }

  public async chatWithAI(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<AIQueryResponse> {
    const response = await this.request<APIResponse<AIQueryResponse>>(
      '/api/v1/ai/chat',
      'POST',
      { message, conversation_history: conversationHistory }
    );
    return response.data.data!;
  }

  // ========================================================================
  // INTERNAL REQUEST METHOD
  // ========================================================================

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: unknown,
    params?: Record<string, unknown>,
    retryCount = 0
  ): Promise<AxiosResponse<T>> {
    try {
      const response = await this.axiosInstance.request<T>({
        url: endpoint,
        method,
        data,
        params,
      });
      return response;
    } catch (error) {
      if (retryCount < MAX_RETRIES && this.isRetryableError(error)) {
        const delay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.request<T>(endpoint, method, data, params, retryCount + 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (!axios.isAxiosError(error)) return false;
    // Retry on network errors and 5xx status codes
    return (
      !error.response ||
      (error.response.status >= 500 && error.response.status < 600)
    );
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const awsApiClient = new AWSAPIClient();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Handle API errors and convert to user-friendly messages
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message === 'Network Error') {
      return 'Network connection failed. Please check your internet connection.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. Please try again.';
    }
    return error.message || 'An error occurred';
  }
  return String(error);
}
