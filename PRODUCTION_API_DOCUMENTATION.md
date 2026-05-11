# Console Sensei Cloud Ops - Production API Documentation

## Overview

This document describes the production-grade REST API for Console Sensei Cloud Ops platform. All endpoints use real AWS SDK integration and PostgreSQL persistence.

**Base URL:** `https://api.console-sensei.example.com/api`

**Authentication:** JWT Bearer Token

---

## Authentication

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "admin"
  },
  "expires_in": 86400
}
```

### Using Token

All requests require the `Authorization` header:

```http
Authorization: Bearer <token>
```

---

## AWS Resources API

### EC2 Instances

#### List EC2 Instances

```http
GET /aws/ec2/instances?region=us-east-1&state=running&max_results=100
Authorization: Bearer <token>
```

**Query Parameters:**
- `region` (string): AWS region (default: us-east-1)
- `state` (string): Filter by state (running, stopped, pending, terminated)
- `max_results` (integer): Maximum results (default: 100, max: 1000)

**Response:**
```json
{
  "success": true,
  "region": "us-east-1",
  "count": 5,
  "instances": [
    {
      "id": "i-0123456789abcdef0",
      "name": "web-server-01",
      "type": "ec2",
      "region": "us-east-1",
      "status": "running",
      "instance_type": "t3.large",
      "cpu_count": 2,
      "memory_gb": 8,
      "public_ip": "54.123.45.67",
      "private_ip": "10.0.1.100",
      "security_groups": ["default", "web-sg"],
      "monitoring_enabled": true,
      "created_at": "2024-01-15T10:30:00Z",
      "tags": {
        "Name": "web-server-01",
        "Environment": "production"
      }
    }
  ],
  "timestamp": "2024-01-20T15:45:30Z"
}
```

#### Get Specific EC2 Instance

```http
GET /aws/ec2/instances/i-0123456789abcdef0?region=us-east-1
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "instance": { /* instance object */ }
}
```

### RDS Instances

#### List RDS Instances

```http
GET /aws/rds/instances?region=us-east-1&max_results=100
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "region": "us-east-1",
  "count": 3,
  "instances": [
    {
      "id": "prod-db-01",
      "name": "prod-db-01",
      "type": "rds",
      "region": "us-east-1",
      "status": "available",
      "engine": "postgres",
      "engine_version": "15.2",
      "instance_class": "db.t3.large",
      "storage_gb": 100,
      "multi_az": true,
      "backup_retention_days": 30,
      "endpoint": "prod-db-01.c9akciq32.us-east-1.rds.amazonaws.com",
      "created_at": "2023-06-10T08:00:00Z",
      "tags": {}
    }
  ],
  "timestamp": "2024-01-20T15:45:30Z"
}
```

### S3 Buckets

#### List S3 Buckets

```http
GET /aws/s3/buckets?region=us-east-1&max_results=100
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "buckets": [
    {
      "id": "my-app-bucket",
      "name": "my-app-bucket",
      "type": "s3",
      "region": "us-east-1",
      "status": "active",
      "size_bytes": 1073741824,
      "object_count": 5000,
      "versioning_enabled": true,
      "encryption_enabled": true,
      "public_access_blocked": true,
      "created_at": "2023-01-01T00:00:00Z",
      "tags": {}
    }
  ],
  "timestamp": "2024-01-20T15:45:30Z"
}
```

### Lambda Functions

#### List Lambda Functions

```http
GET /aws/lambda/functions?region=us-east-1&max_results=100
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "region": "us-east-1",
  "count": 8,
  "functions": [
    {
      "id": "arn:aws:lambda:us-east-1:123456789012:function:process-image",
      "name": "process-image",
      "type": "lambda",
      "region": "us-east-1",
      "status": "active",
      "runtime": "python3.11",
      "handler": "index.handler",
      "memory_mb": 512,
      "timeout_seconds": 60,
      "code_size_bytes": 2097152,
      "last_modified": "2024-01-15T10:30:00Z",
      "created_at": "2023-06-01T00:00:00Z",
      "tags": {}
    }
  ],
  "timestamp": "2024-01-20T15:45:30Z"
}
```

### Security Hub

#### List Security Findings

```http
GET /aws/security-hub/findings?region=us-east-1&severity=CRITICAL&severity=HIGH&max_results=100
Authorization: Bearer <token>
```

**Query Parameters:**
- `region` (string): AWS region
- `severity` (string[]): Filter by severity (CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL)
- `max_results` (integer): Maximum results

**Response:**
```json
{
  "success": true,
  "region": "us-east-1",
  "total_count": 12,
  "by_severity": {
    "CRITICAL": 2,
    "HIGH": 5,
    "MEDIUM": 5
  },
  "findings": [
    {
      "id": "arn:aws:securityhub:us-east-1::finding/1",
      "title": "S3 bucket policy allows public access",
      "severity": "HIGH",
      "status": "ACTIVE",
      "resource_type": "s3",
      "resource_id": "arn:aws:s3:::my-bucket",
      "description": "S3 bucket has public read access enabled",
      "remediation": "Block public access using S3 Block Public Access",
      "first_observed_at": "2024-01-10T00:00:00Z",
      "last_observed_at": "2024-01-20T15:45:30Z"
    }
  ],
  "timestamp": "2024-01-20T15:45:30Z"
}
```

#### Get Security Compliance

```http
GET /aws/security-hub/compliance?region=us-east-1
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "region": "us-east-1",
  "total_findings": 12,
  "by_severity": {
    "CRITICAL": 2,
    "HIGH": 5,
    "MEDIUM": 5
  },
  "compliance_score": 94,
  "timestamp": "2024-01-20T15:45:30Z"
}
```

### CloudTrail

#### List CloudTrail Events

```http
GET /aws/cloudtrail/events?region=us-east-1&event_name=RunInstances&max_results=50
Authorization: Bearer <token>
```

**Query Parameters:**
- `region` (string): AWS region
- `event_name` (string): Filter by event name
- `max_results` (integer): Maximum results (max: 50)

**Response:**
```json
{
  "success": true,
  "region": "us-east-1",
  "count": 5,
  "events": [
    {
      "event_id": "abc123def456",
      "event_name": "RunInstances",
      "event_time": "2024-01-20T15:30:00Z",
      "username": "admin@example.com",
      "source_ip": "203.0.113.45",
      "user_agent": "aws-cli/2.13.0",
      "aws_region": "us-east-1",
      "resource_type": "AWS::EC2::Instance",
      "resource_name": "i-0123456789abcdef0",
      "event_source": "ec2.amazonaws.com",
      "success": true,
      "error_code": null,
      "error_message": null
    }
  ],
  "timestamp": "2024-01-20T15:45:30Z"
}
```

---

## AI API

### List Available Providers

```http
GET /ai/providers
Authorization: Bearer <token>
```

**Response:**
```json
{
  "providers": [
    {
      "id": "claude",
      "name": "Claude (Anthropic)",
      "models": [
        {
          "id": "claude-3-5-sonnet-20241022",
          "name": "Claude 3.5 Sonnet",
          "size": "medium",
          "max_tokens": 200000
        },
        {
          "id": "claude-3-5-haiku-20241022",
          "name": "Claude 3.5 Haiku",
          "size": "small",
          "max_tokens": 200000
        }
      ]
    },
    {
      "id": "openai",
      "name": "OpenAI",
      "models": [
        {
          "id": "gpt-4-turbo",
          "name": "GPT-4 Turbo",
          "size": "large",
          "max_tokens": 128000
        }
      ]
    }
  ]
}
```

### Create AI Conversation

```http
POST /ai/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Cost Optimization Analysis",
  "provider": "claude",
  "model": "claude-3-5-sonnet-20241022"
}
```

**Response:**
```json
{
  "success": true,
  "conversation": {
    "id": "uuid",
    "title": "Cost Optimization Analysis",
    "provider": "claude",
    "model": "claude-3-5-sonnet-20241022",
    "created_at": "2024-01-20T15:45:30Z"
  }
}
```

### Send AI Message

```http
POST /ai/conversations/{conversation_id}/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Analyze my EC2 costs and suggest optimizations",
  "system_prompt": "You are a cloud cost optimization expert"
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "uuid",
    "role": "assistant",
    "content": "Based on your EC2 usage patterns, I recommend...",
    "tokens_used": 1250,
    "cost_usd": 0.0375,
    "created_at": "2024-01-20T15:45:30Z"
  }
}
```

---

## Cost Management API

### Get Cost Summary

```http
GET /costs/summary?account_id=uuid&start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "account_id": "uuid",
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "total_cost_usd": 5432.10,
  "by_service": [
    {
      "service": "EC2",
      "cost_usd": 2100.50,
      "resource_count": 12,
      "trend_percent": 5.2
    },
    {
      "service": "RDS",
      "cost_usd": 890.00,
      "resource_count": 3,
      "trend_percent": -2.1
    }
  ],
  "timestamp": "2024-01-20T15:45:30Z"
}
```

---

## Anomaly Detection API

### List Anomalies

```http
GET /anomalies?account_id=uuid&status=open&severity=high&max_results=50
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "anomalies": [
    {
      "id": "uuid",
      "resource_id": "uuid",
      "anomaly_type": "cost_spike",
      "severity": "high",
      "title": "Unexpected cost spike in EC2",
      "description": "EC2 costs increased by 45% compared to baseline",
      "baseline_value": 1000.0,
      "current_value": 1450.0,
      "deviation_percent": 45.0,
      "status": "open",
      "detected_at": "2024-01-20T14:30:00Z"
    }
  ],
  "timestamp": "2024-01-20T15:45:30Z"
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "Invalid request",
  "message": "Missing required parameter: region",
  "timestamp": "2024-01-20T15:45:30Z"
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "timestamp": "2024-01-20T15:45:30Z"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions for this action",
  "timestamp": "2024-01-20T15:45:30Z"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred",
  "timestamp": "2024-01-20T15:45:30Z"
}
```

---

## Rate Limiting

All endpoints are rate-limited:

- **Standard endpoints:** 100 requests per minute
- **Security endpoints:** 50 requests per minute
- **AI endpoints:** 30 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705779930
```

---

## WebSocket Real-Time Updates

### Connect

```javascript
const ws = new WebSocket('wss://api.console-sensei.example.com/ws?token=<jwt_token>');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message.type, message.data);
};
```

### Message Types

#### Resource Update
```json
{
  "type": "resource_update",
  "data": {
    "resource_id": "i-0123456789abcdef0",
    "resource_type": "ec2",
    "status": "running",
    "metrics": {
      "cpu_utilization": 45.2,
      "network_in": 1024000,
      "network_out": 512000
    }
  },
  "timestamp": "2024-01-20T15:45:30Z"
}
```

#### Cost Update
```json
{
  "type": "cost_update",
  "data": {
    "account_id": "uuid",
    "service": "EC2",
    "cost_usd": 2100.50,
    "trend_percent": 5.2
  },
  "timestamp": "2024-01-20T15:45:30Z"
}
```

#### Anomaly Alert
```json
{
  "type": "anomaly_detected",
  "data": {
    "anomaly_id": "uuid",
    "resource_id": "uuid",
    "anomaly_type": "cost_spike",
    "severity": "high",
    "title": "Unexpected cost spike",
    "description": "EC2 costs increased by 45%"
  },
  "timestamp": "2024-01-20T15:45:30Z"
}
```

---

## Pagination

Endpoints that return lists support pagination:

```http
GET /aws/ec2/instances?page=1&page_size=20
```

**Response:**
```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_count": 150,
    "total_pages": 8
  }
}
```

---

## Filtering & Sorting

### Filtering

```http
GET /resources?type=ec2&status=running&region=us-east-1
```

### Sorting

```http
GET /resources?sort_by=created_at&sort_order=desc
```

---

## Versioning

API version is specified in the URL:

```http
GET /v1/aws/ec2/instances
GET /v2/aws/ec2/instances
```

Current version: **v1**

---

## Support

For API support, contact: `api-support@console-sensei.example.com`

For documentation updates, visit: `https://docs.console-sensei.example.com`
