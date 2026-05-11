# Backend API Documentation
## Enterprise Cloud Ops Platform

### Overview
This document describes all REST API endpoints for the ConsoleSensei Cloud Ops backend. The backend is built with Flask and provides real AWS resource monitoring, AI analysis, and user management.

---

## API Base URL
```
Development:  http://localhost:5000/api/v1
Production:   https://api.consolesensei.com/api/v1
```

---

## Authentication

All endpoints require JWT authentication (except `/auth/login` and `/health`).

### Request Header
```
Authorization: Bearer <access_token>
```

### Token Refresh
Tokens expire after 24 hours. Use the refresh endpoint:
```
POST /api/v1/auth/refresh
Content-Type: application/json
{
  "refresh_token": "..."
}
Response: { "access_token": "...", "expires_in": 86400 }
```

---

## Error Handling

All API responses follow a consistent error format:
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Instance i-12345 not found in us-east-1",
    "details": {}
  },
  "request_id": "req-uuid-here"
}
```

### Error Codes
- `UNAUTHORIZED` - Missing or invalid JWT token
- `FORBIDDEN` - User lacks required permissions
- `RESOURCE_NOT_FOUND` - AWS resource doesn't exist
- `AWS_API_ERROR` - Underlying AWS API call failed
- `VALIDATION_ERROR` - Invalid request parameters
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server-side error

---

## Authentication Endpoints

### Login
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}

Response 200:
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "ref...",
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "roles": ["editor"],
      "permissions": ["resource:read", "resource:modify", "ai:query"],
      "organization": "ACME Corp"
    },
    "expires_in": 86400
  }
}
```

### Refresh Token
```
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "ref..."
}

Response 200:
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "expires_in": 86400
  }
}
```

### Get Profile
```
GET /api/v1/auth/profile
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "roles": ["editor"],
    "permissions": ["resource:read", "resource:modify", "ai:query"],
    "organization": "ACME Corp",
    "created_at": "2024-01-15T10:30:00Z",
    "last_login": "2024-01-20T14:22:00Z"
  }
}
```

### Logout
```
POST /api/v1/auth/logout
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

---

## AWS Resources Endpoints

### Get EC2 Instances
```
GET /api/v1/resources/ec2?region=us-east-1&page=1&page_size=50
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "items": [
      {
        "instance_id": "i-0123456789abcdef0",
        "instance_name": "prod-web-server-01",
        "instance_type": "t3.large",
        "state": "running",
        "status": "safe",
        "region": "us-east-1",
        "cost_per_month": 45.50,
        "public_ip": "54.123.45.67",
        "private_ip": "10.0.1.100",
        "security_groups": ["sg-0123456", "sg-7890abc"],
        "tags": {
          "Name": "prod-web-server-01",
          "Environment": "production",
          "Owner": "team-platform"
        },
        "launch_time": "2024-01-10T14:30:00Z",
        "cpu_utilization": 35.2,
        "network_in": 1024000,
        "network_out": 512000
      }
    ],
    "total": 156,
    "page": 1,
    "page_size": 50,
    "total_pages": 4
  }
}

Query Parameters:
- region (optional): Filter by region (e.g., us-east-1)
- state (optional): Filter by state (running, stopped, terminated)
- page: Page number (default: 1)
- page_size: Items per page (default: 50, max: 100)
```

### Get RDS Instances
```
GET /api/v1/resources/rds?region=us-east-1&page=1&page_size=50
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "items": [
      {
        "db_instance_identifier": "prod-postgres-01",
        "db_instance_name": "Production Database",
        "db_engine": "postgres",
        "db_engine_version": "15.2",
        "db_instance_class": "db.t3.medium",
        "allocated_storage_gb": 100,
        "status": "available",
        "cost_per_month": 120.75,
        "region": "us-east-1",
        "endpoint": "prod-postgres-01.c123abc.us-east-1.rds.amazonaws.com",
        "multi_az": true,
        "backup_retention_days": 30,
        "auto_minor_version_upgrade": true,
        "publicly_accessible": false,
        "tags": {
          "Name": "prod-postgres-01",
          "Environment": "production"
        }
      }
    ],
    "total": 8,
    "page": 1,
    "page_size": 50,
    "total_pages": 1
  }
}
```

### Get Lambda Functions
```
GET /api/v1/resources/lambda?region=us-east-1&page=1&page_size=50
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "items": [
      {
        "function_name": "order-processor",
        "runtime": "python3.11",
        "memory_size": 512,
        "timeout": 60,
        "handler": "index.handler",
        "status": "safe",
        "cost_per_month": 15.30,
        "region": "us-east-1",
        "last_modified": "2024-01-15T10:30:00Z",
        "code_size": 2048000,
        "description": "Process customer orders from SQS queue",
        "environment_variables": {
          "DB_HOST": "prod-postgres-01.c123abc.us-east-1.rds.amazonaws.com",
          "QUEUE_NAME": "order-queue"
        },
        "environment_encrypted": true,
        "invocations": 125000,
        "errors": 250,
        "average_duration": 1245,
        "throttles": 5,
        "concurrent_executions": 45
      }
    ],
    "total": 23,
    "page": 1,
    "page_size": 50,
    "total_pages": 1
  }
}
```

### Get S3 Buckets
```
GET /api/v1/resources/s3?page=1&page_size=50
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "items": [
      {
        "bucket_name": "prod-data-lake",
        "region": "us-east-1",
        "creation_date": "2023-06-10T08:30:00Z",
        "status": "safe",
        "cost_per_month": 450.20,
        "size_gb": 5240,
        "object_count": 1200000,
        "versioning_enabled": true,
        "encryption": {
          "sse_algorithm": "AES256",
          "kms_master_key": null
        },
        "public_access_block": {
          "block_public_acls": true,
          "block_public_policy": true,
          "ignore_public_acls": true,
          "restrict_public_buckets": true
        },
        "lifecycle_rules": 3,
        "replication_enabled": true,
        "tags": {
          "Environment": "production",
          "DataClassification": "confidential"
        }
      }
    ],
    "total": 12,
    "page": 1,
    "page_size": 50,
    "total_pages": 1
  }
}
```

---

## Activity & Security Endpoints

### Get CloudTrail Events
```
GET /api/v1/activity/cloudtrail?region=us-east-1&days=7&page=1&page_size=50
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "items": [
      {
        "event_id": "evt-123456789",
        "event_name": "DescribeInstances",
        "event_source": "ec2.amazonaws.com",
        "event_time": "2024-01-20T14:30:00Z",
        "username": "arn:aws:iam::123456789:user/alice",
        "source_ip_address": "203.0.113.45",
        "user_agent": "aws-cli/2.13.0",
        "aws_region": "us-east-1",
        "request_parameters": {
          "instanceId": ["i-0123456789abcdef0"]
        },
        "response_elements": null,
        "error_code": null,
        "error_message": null,
        "additional_event_data": {},
        "request_id": "req-uuid"
      }
    ],
    "total": 1245,
    "page": 1,
    "page_size": 50,
    "total_pages": 25
  }
}

Query Parameters:
- region: AWS region (default: us-east-1)
- days: Look back period (7-90, default: 7)
- page: Page number
- page_size: Items per page (default: 50, max: 100)
```

### Get Security Hub Findings
```
GET /api/v1/security/findings?severity=CRITICAL&status=ACTIVE&page=1&page_size=50
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": {
    "items": [
      {
        "finding_id": "sec-find-001",
        "title": "EC2 instance has unrestricted SSH access",
        "description": "Security group sg-0123456 allows unrestricted access on port 22",
        "severity": "CRITICAL",
        "status": "ACTIVE",
        "resource_type": "AwsEc2SecurityGroup",
        "resource_id": "sg-0123456",
        "region": "us-east-1",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-20T14:30:00Z",
        "remediation": {
          "recommendation": {
            "text": "Restrict SSH access to known IP ranges",
            "url": "https://docs.aws.amazon.com/..."
          }
        },
        "compliance_status": "FAILED",
        "resource_details": {
          "GroupId": "sg-0123456",
          "GroupName": "prod-web-sg",
          "IpPermissions": [
            {
              "IpProtocol": "tcp",
              "FromPort": 22,
              "ToPort": 22,
              "IpRanges": [{ "CidrIp": "0.0.0.0/0" }]
            }
          ]
        }
      }
    ],
    "total": 42,
    "page": 1,
    "page_size": 50,
    "total_pages": 1
  }
}

Query Parameters:
- severity: CRITICAL | HIGH | MEDIUM | LOW | INFORMATIONAL
- status: ACTIVE | SUPPRESSED | RESOLVED
- resource_type: AwsEc2Instance | AwsS3Bucket | etc.
- page, page_size
```

---

## AI Endpoints

### Query AI (Single Query)
```
POST /api/v1/ai/query
Authorization: Bearer <token>
Content-Type: application/json

{
  "question": "What are my top cost optimization opportunities?",
  "include_metrics": true,
  "include_costs": true,
  "context": {
    "resource_types": ["ec2", "rds", "s3"],
    "time_period": "last_30_days"
  }
}

Response 200:
{
  "success": true,
  "data": {
    "query_id": "query-uuid",
    "question": "What are my top cost optimization opportunities?",
    "response": "Based on your infrastructure analysis, here are the top 5 cost optimization opportunities:\n\n1. **Rightsize EC2 instances** ($2,150/month potential savings)\n   - You have 3 t3.xlarge instances running at 15-20% CPU utilization...",
    "confidence": 0.92,
    "sources": [
      "EC2 analysis",
      "CloudWatch metrics",
      "Cost Explorer data"
    ],
    "recommendations": [
      {
        "priority": "high",
        "action": "Downsize idle EC2 instances",
        "estimated_savings_monthly": 2150
      },
      {
        "priority": "high",
        "action": "Consolidate RDS databases",
        "estimated_savings_monthly": 850
      }
    ],
    "processing_time_ms": 2350,
    "tokens_used": 1450
  }
}
```

### Chat with AI (Multi-Turn Conversation)
```
POST /api/v1/ai/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversation_id": "conv-uuid-or-null-for-new",
  "message": "What security vulnerabilities should I focus on first?",
  "include_infrastructure_context": true
}

Response 200:
{
  "success": true,
  "data": {
    "conversation_id": "conv-uuid",
    "message_id": "msg-uuid",
    "response": "Based on your Security Hub findings, I'd prioritize these vulnerabilities:\n\n1. **Unrestricted SSH Access** (3 instances)\n   - Risk: Critical\n   - Impact: Potential unauthorized access to production systems...",
    "follow_up_questions": [
      "How do I remediate unrestricted SSH access?",
      "Which security groups need immediate attention?",
      "What's the risk of these findings?"
    ],
    "processing_time_ms": 1850
  }
}
```

---

## System Endpoints

### Health Check
```
GET /api/v1/health

Response 200:
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "database": "connected",
    "aws_connectivity": "available",
    "timestamp": "2024-01-20T14:30:00Z"
  }
}
```

### API Information
```
GET /api/v1/info

Response 200:
{
  "success": true,
  "data": {
    "api_version": "v1",
    "backend_version": "1.0.0",
    "environment": "production",
    "timestamp": "2024-01-20T14:30:00Z",
    "features": [
      "EC2 monitoring",
      "RDS monitoring",
      "Lambda analysis",
      "S3 inventory",
      "CloudTrail activity",
      "Security Hub findings",
      "AI analysis",
      "Cost optimization"
    ]
  }
}
```

---

## Rate Limiting

All API endpoints are rate limited:
- **Default**: 100 requests per 60 seconds per user
- **Rate limit headers**:
  - `X-RateLimit-Limit`: 100
  - `X-RateLimit-Remaining`: 87
  - `X-RateLimit-Reset`: Unix timestamp

Exceeding the limit returns `429 Too Many Requests`.

---

## Pagination

All list endpoints support pagination:

```json
{
  "items": [...],
  "total": 156,
  "page": 1,
  "page_size": 50,
  "total_pages": 4,
  "has_more": true,
  "next_page": 2,
  "prev_page": null
}
```

---

## Permissions Matrix

| Permission | Roles | Use Cases |
|---|---|---|
| `resource:read` | Admin, Editor, Viewer | View AWS resources |
| `resource:modify` | Admin, Editor | Stop/start instances, modify configs |
| `resource:delete` | Admin | Terminate instances, delete resources |
| `billing:read` | Admin, Editor, Viewer | View cost data |
| `billing:modify` | Admin | Modify budgets, cost alerts |
| `security:read` | Admin, Editor, Viewer | View security findings |
| `security:modify` | Admin | Suppress findings, create rules |
| `ai:query` | Admin, Editor, Viewer | Query Claude AI |
| `audit:read` | Admin | View audit logs |
| `system:admin` | Admin | Access admin endpoints |

---

## Frontend Integration Examples

### React Query Pattern
```typescript
import { useQuery } from '@tanstack/react-query';
import { awsApiClient } from '@/lib/api/aws-client';

function EC2Dashboard() {
  const { data, isLoading, error } = useQuery(
    ['ec2-instances'],
    () => awsApiClient.getEC2Instances('us-east-1', 1, 50),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <table>
      <tbody>
        {data?.items?.map(instance => (
          <tr key={instance.id}>
            <td>{instance.name}</td>
            <td>{instance.type}</td>
            <td>${instance.cost_per_month}/month</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Token Refresh Flow
```typescript
// awsApiClient automatically handles:
// 1. Attaches JWT token to all requests
// 2. Detects 401 responses
// 3. Calls /auth/refresh
// 4. Retries original request with new token
// 5. Falls back to login if refresh fails

// Developer just needs to call the API:
const response = await awsApiClient.getEC2Instances('us-east-1', 1, 50);
// All auth complexity handled automatically
```

---

## Deployment Configuration

### Environment Variables
See `.env.example` for comprehensive configuration including:
- AWS credentials and regions
- JWT secret keys
- Claude API key
- Supabase database connection
- CORS allowed origins
- Rate limiting thresholds

### Docker Deployment
```bash
docker build -t consolesensei-backend:1.0.0 .
docker run -p 5000:5000 \
  -e FLASK_ENV=production \
  -e JWT_SECRET_KEY=... \
  -e ANTHROPIC_API_KEY=... \
  consolesensei-backend:1.0.0
```

### Kubernetes Deployment
See `k8s/backend-deployment.yaml` for production Kubernetes manifests with:
- Resource limits and requests
- Health checks and readiness probes
- Horizontal Pod Autoscaling
- Persistent volume for logs
- Service and Ingress configuration

