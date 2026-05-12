/**
 * Data Transfer Objects (DTOs)
 * Shared type definitions for API contracts
 */

// ============================================================================
// RESOURCE DTOs
// ============================================================================

export interface ResourceDTO {
    id: string;
    name: string;
    type: string;
    region: string;
    status: 'safe' | 'warning' | 'critical';
    value: string;
    description: string;
    metadata?: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
}

export interface ResourceListDTO {
    items: ResourceDTO[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

// ============================================================================
// ALERT DTOs
// ============================================================================

export interface AlertDTO {
    id: string;
    type: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    time: string;
    timestamp: string;
    severity?: 'critical' | 'high' | 'medium' | 'low';
    resourceId?: string;
    resourceType?: string;
}

export interface AlertListDTO {
    items: AlertDTO[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

// ============================================================================
// ACTIVITY DTOs
// ============================================================================

export interface ActivityDTO {
    id: string;
    action: string;
    resource: string;
    time: string;
    user: string;
    timestamp: string;
    eventType: string;
    region?: string;
    details?: Record<string, unknown>;
}

export interface ActivityListDTO {
    items: ActivityDTO[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

// ============================================================================
// COST DTOs
// ============================================================================

export interface CostDataDTO {
    month: string;
    cost: number;
    currency?: string;
    breakdown?: Record<string, number>;
}

export interface CostSummaryDTO {
    currentMonth: number;
    previousMonth: number;
    monthlyAverage: number;
    trend: 'up' | 'down' | 'stable';
    trendPercentage: number;
    currency: string;
}

export interface CostForecastDTO {
    month: string;
    predictedCost: number;
    confidence: number;
    factors: string[];
}

// ============================================================================
// SECURITY DTOs
// ============================================================================

export interface SecurityFindingDTO {
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: string;
    resourceType: string;
    description: string;
    region?: string;
    lastUpdated?: string;
    remediation?: string;
}

export interface SecurityFindingListDTO {
    items: SecurityFindingDTO[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

export interface SecurityScoreDTO {
    overall: number;
    security: number;
    costEfficiency: number;
    bestPractices: number;
    criticalIssues: number;
    recommendations: string[];
}

// ============================================================================
// AUDIT DTOs
// ============================================================================

export interface AuditLogDTO {
    id: string;
    action: string;
    userId: string;
    resourceId: string;
    resourceType: string;
    timestamp: string;
    details: Record<string, unknown>;
    status: 'success' | 'failure';
    ipAddress?: string;
}

export interface AuditLogListDTO {
    items: AuditLogDTO[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

// ============================================================================
// USER DTOs
// ============================================================================

export interface UserDTO {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'editor' | 'viewer';
    status: 'active' | 'inactive' | 'suspended';
    createdAt: string;
    lastLogin?: string;
    avatar?: string;
}

export interface UserListDTO {
    items: UserDTO[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

export interface CreateUserDTO {
    email: string;
    name: string;
    role: 'admin' | 'editor' | 'viewer';
    password: string;
}

export interface UpdateUserDTO {
    name?: string;
    role?: 'admin' | 'editor' | 'viewer';
    status?: 'active' | 'inactive' | 'suspended';
}

// ============================================================================
// AUTHENTICATION DTOs
// ============================================================================

export interface LoginRequestDTO {
    email: string;
    password: string;
}

export interface LoginResponseDTO {
    success: boolean;
    token: string;
    refreshToken: string;
    user: UserDTO;
    expiresIn: number;
}

export interface RefreshTokenRequestDTO {
    refreshToken: string;
}

export interface RefreshTokenResponseDTO {
    success: boolean;
    token: string;
    expiresIn: number;
}

// ============================================================================
// ACCOUNT DTOs
// ============================================================================

export interface AccountDTO {
    id: string;
    name: string;
    accountId: string;
    region: string;
    status: 'connected' | 'disconnected' | 'error';
    createdAt: string;
    lastSync?: string;
    resourceCount?: number;
}

export interface AccountListDTO {
    items: AccountDTO[];
    total: number;
}

export interface ConnectAccountDTO {
    name: string;
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
}

// ============================================================================
// PAGINATION DTOs
// ============================================================================

export interface PaginationParamsDTO {
    limit?: number;
    offset?: number;
    nextToken?: string;
}

export interface PaginatedResponseDTO<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    nextToken?: string;
}

// ============================================================================
// ERROR DTOs
// ============================================================================

export interface ErrorDTO {
    success: false;
    error: string;
    message: string;
    status: number;
    details?: Record<string, unknown>;
    timestamp: string;
}

export interface ValidationErrorDTO extends ErrorDTO {
    errors: Record<string, string[]>;
}

// ============================================================================
// API RESPONSE DTOs
// ============================================================================

export interface ApiResponseDTO<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    status: number;
    timestamp: string;
}

export interface ApiListResponseDTO<T> {
    success: boolean;
    data: PaginatedResponseDTO<T>;
    status: number;
    timestamp: string;
}

// ============================================================================
// FILTER DTOs
// ============================================================================

export interface FilterDTO {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
    value: unknown;
}

export interface SortDTO {
    field: string;
    direction: 'asc' | 'desc';
}

export interface QueryDTO {
    filters?: FilterDTO[];
    sort?: SortDTO[];
    pagination?: PaginationParamsDTO;
}

// ============================================================================
// EXPORT DTOs
// ============================================================================

export interface ExportRequestDTO {
    format: 'pdf' | 'csv' | 'json';
    type: 'resources' | 'costs' | 'security' | 'audit';
    filters?: FilterDTO[];
    dateRange?: {
        start: string;
        end: string;
    };
}

export interface ExportResponseDTO {
    success: boolean;
    downloadUrl: string;
    filename: string;
    size: number;
    expiresAt: string;
}

// ============================================================================
// WEBHOOK DTOs
// ============================================================================

export interface WebhookDTO {
    id: string;
    name: string;
    url: string;
    events: string[];
    active: boolean;
    createdAt: string;
    lastTriggered?: string;
}

export interface WebhookEventDTO {
    id: string;
    webhookId: string;
    event: string;
    payload: Record<string, unknown>;
    status: 'pending' | 'success' | 'failed';
    timestamp: string;
    retries: number;
}

// ============================================================================
// NOTIFICATION DTOs
// ============================================================================

export interface NotificationDTO {
    id: string;
    type: 'alert' | 'info' | 'warning' | 'error';
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    actionUrl?: string;
}

export interface NotificationListDTO {
    items: NotificationDTO[];
    unreadCount: number;
    total: number;
}
