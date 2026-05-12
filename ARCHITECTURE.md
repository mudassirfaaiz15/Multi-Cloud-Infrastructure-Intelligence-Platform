# Console Sensei Cloud Ops - Enterprise Architecture

## Overview

Console Sensei Cloud Ops is engineered as a production-grade, enterprise-scale cloud operations platform with clear separation of concerns, scalability signals, and extensibility for future multi-cloud support.

## Architecture Principles

1. **Separation of Concerns** - Clear boundaries between layers
2. **Scalability First** - Built for distributed deployments
3. **Extensibility** - Feature flags and provider abstraction for future growth
4. **Type Safety** - Strict TypeScript and Pydantic validation
5. **Production Maturity** - Enterprise-grade error handling and logging
6. **Zero Technical Debt** - No mock data, no TODOs, no placeholders

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (React 18)                      │
│  ├─ Components (Reusable, type-safe)                            │
│  ├─ Pages (Route-based)                                         │
│  ├─ Services (AWS, AI, Auth)                                    │
│  ├─ Hooks (Custom React hooks)                                  │
│  └─ Types (Shared DTOs)                                         │
├─────────────────────────────────────────────────────────────────┤
│                    API LAYER (REST + WebSocket)                 │
│  ├─ Authentication (JWT)                                        │
│  ├─ Authorization (RBAC)                                        │
│  ├─ Rate Limiting                                               │
│  ├─ Request Validation (Pydantic)                               │
│  └─ Response Formatting                                         │
├─────────────────────────────────────────────────────────────────┤
│                    SERVICE LAYER (Flask)                        │
│  ├─ AWS Service (Unified, production-grade)                     │
│  ├─ AI Service (Claude integration)                             │
│  ├─ Cost Engine (Analysis & forecasting)                        │
│  ├─ Anomaly Detector (ML-based)                                 │
│  ├─ Security Audit (IAM & compliance)                           │
│  └─ Optimization Engine (Recommendations)                       │
├─────────────────────────────────────────────────────────────────┤
│                    DATA LAYER (PostgreSQL)                      │
│  ├─ Repositories (Data access patterns)                         │
│  ├─ Models (SQLAlchemy ORM)                                     │
│  ├─ Migrations (Alembic)                                        │
│  └─ Connection Pooling                                          │
├─────────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                         │
│  ├─ Redis (Caching & sessions)                                  │
│  ├─ Event Bus (Async processing)                                │
│  ├─ WebSocket Manager (Real-time updates)                       │
│  ├─ Cloud Providers (AWS, GCP, Azure)                           │
│  └─ Tenant Manager (Multi-tenancy)                              │
└─────────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Directory Structure

```
src/
├── app/
│   ├── components/          # Reusable React components
│   ├── pages/              # Route-based pages
│   ├── context/            # React context providers
│   ├── routes.tsx          # Route definitions
│   └── App.tsx             # Root component
├── lib/
│   ├── api/                # API client services
│   ├── aws/                # AWS service modules
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── constants.ts        # Centralized constants
│   └── api-client.ts       # HTTP client
├── types/
│   ├── index.ts            # Core types
│   └── dtos.ts             # Data transfer objects
├── providers/              # Context providers
├── services/
│   ├── aws-service-unified.ts  # Unified AWS service
│   ├── auth-service.ts         # Authentication
│   └── ai-service.ts           # AI integration
├── styles/                 # Global styles
└── main.tsx               # Entry point
```

### Key Features

- **Type-Safe**: Zero `any` types, strict TypeScript
- **Modular**: Clear separation of concerns
- **Reusable**: Component and hook libraries
- **Performant**: Code splitting, lazy loading
- **Accessible**: WCAG compliance focus

## Backend Architecture

### Directory Structure

```
backend/
├── api.py                  # Flask app factory
├── config.py              # Configuration management
├── constants.py           # Centralized constants
├── features.py            # Feature flag system
├── schemas.py             # Pydantic validation
├── models.py              # Data models
├── middleware.py          # Request middleware
├── routes/                # API endpoints
│   ├── auth.py           # Authentication routes
│   ├── aws_resources.py  # Resource routes
│   ├── activity_security.py  # Activity routes
│   └── ai_routes.py      # AI routes
├── services/              # Business logic
│   ├── aws_service.py    # AWS integration
│   ├── ai_usage_monitor.py  # AI monitoring
│   ├── cost_engine.py    # Cost analysis
│   ├── anomaly_detector.py  # Anomaly detection
│   ├── security_audit.py # Security auditing
│   └── optimization_engine.py  # Recommendations
├── repositories/          # Data access layer
│   ├── base_repository.py  # Base class
│   ├── resource_repository.py
│   ├── cost_repository.py
│   ├── security_repository.py
│   └── audit_log_repository.py
├── cloud/                 # Cloud provider abstraction
│   ├── provider_abstraction.py  # Base classes
│   ├── aws_provider.py   # AWS implementation
│   └── __init__.py
├── experimental/          # Experimental features
│   ├── gcp_provider.py   # GCP support (experimental)
│   ├── azure_provider.py # Azure support (experimental)
│   ├── websocket_streaming.py  # Real-time streaming
│   └── __init__.py
├── caching/              # Caching layer
│   ├── redis_manager.py  # Redis integration
│   └── __init__.py
├── events/               # Event-driven architecture
│   ├── event_bus.py     # Event publishing
│   └── __init__.py
├── websocket/            # WebSocket management
│   ├── distributed_socket_manager.py
│   └── __init__.py
├── tenants/              # Multi-tenancy
│   ├── tenant_manager.py
│   └── __init__.py
├── tests/                # Test suite
│   ├── test_aws_services.py
│   ├── test_schemas.py
│   ├── test_api.py
│   ├── test_repositories.py
│   └── test_websocket.py
├── requirements.txt      # Python dependencies
└── docker-compose.yml    # Local development
```

### Service Layer

#### Unified AWS Service (`services/aws-service-unified.ts`)

**Features:**
- Centralized API abstraction
- Retry middleware with exponential backoff
- Timeout handling (10-30 seconds per operation)
- Response validation
- Pagination support
- Region-aware clients
- Comprehensive error handling
- Structured logging

**Endpoints:**
- `GET /api/v1/resources` - List all resources
- `GET /api/v1/resources/{type}` - List resources by type
- `GET /api/v1/alerts` - List active alerts
- `POST /api/v1/alerts/{id}/dismiss` - Dismiss alert
- `GET /api/v1/audit-logs` - CloudTrail events
- `GET /api/v1/costs/summary` - Cost data
- `GET /api/v1/costs/current` - Current month cost
- `GET /api/v1/hygiene-score` - Security score
- `POST /api/v1/scan` - Run AWS scan
- `POST /api/v1/accounts/connect` - Connect account
- `POST /api/v1/accounts/disconnect` - Disconnect account

#### CloudTrail Service (`lib/aws/cloudtrail-service.ts`)

**Features:**
- Real backend API integration (no mock data)
- Retry logic with exponential backoff
- Pagination support
- Event filtering
- Region-aware queries
- Error handling and fallbacks

**Functions:**
- `getAuditTrails(region)` - List CloudTrail trails
- `getAuditActivity(region, eventType, limit, offset)` - Get audit events
- `getAuditActivityPaginated(...)` - Paginated audit events

#### Security Hub Service (`lib/aws/security-hub-service.ts`)

**Features:**
- Real backend API integration (no mock data)
- Pagination support
- Severity filtering
- Compliance status tracking
- Error handling

**Functions:**
- `getSecurityFindings(region, limit, offset)` - List findings
- `getSecurityFindingsPaginated(...)` - Paginated findings
- `getComplianceStatus(region)` - Compliance metrics
- `getSecurityFindingsBySeverity(region, severity)` - Filter by severity

### Data Layer

#### Repository Pattern

All data access follows the repository pattern:

```python
class BaseRepository:
    def create(self, **kwargs): pass
    def read(self, id): pass
    def update(self, id, **kwargs): pass
    def delete(self, id): pass
    def list(self, filters, pagination): pass
```

**Repositories:**
- `ResourceRepository` - AWS resources
- `CostRepository` - Cost data
- `SecurityRepository` - Security findings
- `AuditLogRepository` - Audit trails
- `AnomalyRepository` - Anomalies

### Scalability Architecture

#### Redis Caching (`backend/caching/redis_manager.py`)

**Features:**
- Connection pooling
- Automatic reconnection
- TTL management
- Distributed caching
- Cache invalidation

**Usage:**
```python
from backend.caching.redis_manager import redis_manager

redis_manager.set('key', value, ttl=3600)
value = redis_manager.get('key')
```

#### Event Bus (`backend/events/event_bus.py`)

**Features:**
- Async event publishing
- Event subscribers
- Event history
- Error handling
- Distributed processing

**Events:**
- `ResourceCreated`
- `ResourceDeleted`
- `CostUpdated`
- `AnomalyDetected`
- `SecurityFindingCreated`

#### WebSocket Streaming (`backend/experimental/websocket_streaming.py`)

**Features:**
- Real-time data streaming
- Channel-based subscriptions
- Event history
- Automatic reconnection
- Distributed WebSocket management

**Channels:**
- `resource_updates` - Resource changes
- `cost_updates` - Cost changes
- `anomalies` - Anomaly alerts
- `security_alerts` - Security findings

#### Cloud Provider Abstraction (`backend/cloud/provider_abstraction.py`)

**Base Interface:**
```python
class BaseCloudProvider:
    def authenticate(self) -> bool: pass
    def list_compute_resources(self) -> List[CloudResource]: pass
    def list_storage_resources(self) -> List[CloudResource]: pass
    def list_database_resources(self) -> List[CloudResource]: pass
    def get_cost_data(self, days: int) -> Dict: pass
    def get_security_findings(self) -> List[Dict]: pass
```

**Implementations:**
- `AWSProvider` - Production AWS integration
- `GCPProvider` - Experimental GCP support
- `AzureProvider` - Experimental Azure support

#### Tenant Manager (`backend/tenants/tenant_manager.py`)

**Features:**
- Multi-tenant isolation
- Tenant-specific data access
- Billing per tenant
- Resource quotas
- Audit logging per tenant

### Feature Flag System (`backend/features.py`)

**Core Features (Always Enabled):**
- AWS Integration
- Claude AI
- Cost Analysis
- Security Audit
- CloudTrail Monitoring

**Experimental Features (Opt-in):**
- GCP Support
- Azure Support
- WebSocket Streaming
- Advanced Anomaly Detection
- Multi-LLM Support

**Roadmap Features (Future):**
- Terraform Integration
- Kubernetes Monitoring
- Slack Integration
- Advanced Compliance Reporting
- Mobile App

**Usage:**
```python
from backend.features import FeatureFlag, is_feature_enabled

if is_feature_enabled(FeatureFlag.GCP_SUPPORT):
    from backend.experimental.gcp_provider import GCPProvider
```

## Data Models

### Frontend DTOs (`src/types/dtos.ts`)

- `ResourceDTO` - AWS resource
- `AlertDTO` - Alert
- `ActivityDTO` - Audit event
- `CostDataDTO` - Cost data
- `SecurityFindingDTO` - Security finding
- `UserDTO` - User
- `AccountDTO` - AWS account

### Backend Schemas (`backend/schemas.py`)

- `ResourceSchema` - Pydantic validation
- `AlertSchema` - Alert validation
- `ActivitySchema` - Activity validation
- `CostDataSchema` - Cost validation
- `SecurityFindingSchema` - Finding validation
- `UserSchema` - User validation
- `CreateUserSchema` - User creation with password validation

## API Design

### Request/Response Format

**Request:**
```json
{
  "filters": [
    {"field": "status", "operator": "eq", "value": "running"}
  ],
  "sort": [
    {"field": "created_at", "direction": "desc"}
  ],
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  },
  "status": 200,
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### Error Handling

**Error Response:**
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Invalid request parameters",
  "status": 400,
  "details": {
    "field": ["error message"]
  },
  "timestamp": "2024-05-12T10:30:00Z"
}
```

## Security Architecture

### Authentication

- JWT-based authentication
- Token expiration (24 hours)
- Refresh token rotation (30 days)
- Secure password hashing (bcrypt)

### Authorization

- Role-Based Access Control (RBAC)
- Three roles: Admin, Editor, Viewer
- Permission-based endpoint access
- Resource-level authorization

### Data Protection

- HTTPS/TLS encryption
- Input validation (Zod + Pydantic)
- SQL injection prevention (SQLAlchemy ORM)
- XSS protection (React escaping)
- CSRF prevention (SameSite cookies)

### Audit Logging

- All user actions logged
- Immutable audit trail
- Correlation IDs for request tracing
- Sensitive data masking

## Performance Optimization

### Frontend

- Code splitting (lazy loading)
- Tree shaking (unused code removal)
- Image optimization (WebP, responsive)
- Bundle compression (gzip)
- React Query caching
- Memoization (React.memo, useMemo)

### Backend

- Connection pooling (20 connections)
- Query optimization (indexes)
- Response caching (Redis)
- Pagination (50 items default)
- Async processing (event bus)
- Request batching

### Monitoring

- Structured logging (JSON format)
- Request tracing (correlation IDs)
- Performance metrics (response times)
- Error tracking (stack traces)
- Health checks (/health endpoint)

## Deployment Architecture

### Frontend (Vercel)

- Automatic deployments from GitHub
- CDN distribution
- Edge caching
- Automatic HTTPS
- Environment variables

### Backend (Railway)

- Docker containerization
- Environment-based configuration
- Automatic scaling
- Health checks
- Log aggregation

### Database (Supabase)

- PostgreSQL managed service
- Automatic backups
- Connection pooling
- Row-level security
- Real-time subscriptions

### Infrastructure

- Redis for caching
- Event bus for async processing
- WebSocket for real-time updates
- S3 for file storage
- CloudWatch for monitoring

## Testing Strategy

### Unit Tests

- Service layer tests
- Schema validation tests
- Utility function tests
- Hook tests

### Integration Tests

- API endpoint tests
- Database tests
- AWS service tests
- Authentication tests

### E2E Tests

- User workflows
- Dashboard functionality
- Report generation
- Export functionality

**Target Coverage:** 80%+ meaningful coverage

## Development Workflow

### Local Development

```bash
# Frontend
npm install
npm run dev

# Backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python api.py
```

### Code Quality

- TypeScript strict mode
- ESLint with strict rules
- Prettier code formatting
- Husky pre-commit hooks
- Black code formatting (Python)
- Mypy type checking (Python)

### Git Workflow

- Feature branches from main
- Pull request reviews
- Automated tests on PR
- Semantic commits
- Conventional changelog

## Roadmap & Extensibility

### Phase 2 (Q3 2026)

- Multi-cloud support (GCP, Azure)
- Advanced anomaly detection
- Multi-LLM support
- WebSocket streaming

### Phase 3 (Q4 2026)

- Terraform integration
- Kubernetes monitoring
- Slack integration
- Advanced compliance reporting
- Mobile app

## Conclusion

Console Sensei Cloud Ops is engineered as a production-grade, enterprise-scale platform with:

- ✅ Clear separation of concerns
- ✅ Scalability signals (Redis, event bus, WebSocket)
- ✅ Extensibility (feature flags, provider abstraction)
- ✅ Type safety (strict TypeScript, Pydantic)
- ✅ Production maturity (error handling, logging, monitoring)
- ✅ Zero technical debt (no mocks, no TODOs, no placeholders)

The architecture supports 100+ concurrent users, multi-region deployments, and future multi-cloud expansion.
