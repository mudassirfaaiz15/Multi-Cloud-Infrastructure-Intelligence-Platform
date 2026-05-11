# Complete Implementation Guide - ConsoleSensei Cloud Ops

## Overview

This guide provides step-by-step instructions for implementing all phases, fixing identified issues, and deploying the complete application.

**Status**: Phase 1 & 2 Complete | Phase 3 (Deployment) Ready

---

## Part 1: Backend Setup

### 1.1 Python Environment

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 1.2 Environment Configuration

Create `.env` file in `backend/` directory:

```env
# Flask Configuration
FLASK_ENV=development
PORT=5000
DEBUG=True

# JWT Configuration
JWT_SECRET_KEY=your-secret-key-change-this-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRATION=86400
JWT_REFRESH_TOKEN_EXPIRATION=604800

# Encryption
ENCRYPTION_KEY=your-encryption-key-change-this

# AWS Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# Anthropic Claude AI
ANTHROPIC_API_KEY=your-anthropic-api-key

# Database (Phase 3)
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
DATABASE_URL=postgresql://user:password@localhost/dbname

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Logging
LOG_LEVEL=INFO
```

### 1.3 Verify Backend Compilation

```bash
# Check Python syntax
python -m py_compile api.py models.py middleware.py routes/*.py

# Should output no errors
```

### 1.4 Run Backend Server

```bash
# Development mode
python api.py

# Production mode
FLASK_ENV=production gunicorn --bind 0.0.0.0:5000 --workers 4 api:app

# With custom port
PORT=8000 python api.py
```

**Backend should be running on**: `http://localhost:5000`

---

## Part 2: Frontend Setup

### 2.1 Node Environment

```bash
# Navigate to project root
cd ..

# Install dependencies
npm install

# Verify all packages installed
npm list | grep "found 0 vulnerabilities"
```

### 2.2 Environment Configuration

Create `.env.local` file in root directory:

```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=ConsoleSensei Cloud Ops
VITE_APP_VERSION=2.0.0
VITE_LOG_LEVEL=debug
```

### 2.3 Build Configuration

Verify `vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
```

### 2.4 Run Frontend Development Server

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Frontend should be running on**: `http://localhost:5173`

---

## Part 3: Database Setup (Optional - Phase 3)

### 3.1 Supabase Setup

1. Go to https://supabase.com
2. Create new project
3. Get `SUPABASE_URL` and `SUPABASE_KEY`
4. Update `.env` with credentials

### 3.2 Create Database Schema

```sql
-- Execute this SQL in Supabase SQL Editor

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Roles junction table
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- Role Permissions junction table
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- Audit Logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100),
  resource VARCHAR(100),
  method VARCHAR(10),
  status INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

---

## Part 4: Complete Application Flow

### 4.1 Start All Services

**Terminal 1 - Backend**:
```bash
cd backend
source venv/bin/activate
python api.py
```

**Terminal 2 - Frontend**:
```bash
npm run dev
```

**Terminal 3 - Database** (if using Docker):
```bash
docker-compose -f docker-compose.dev.yml up
```

### 4.2 Test Endpoints

```bash
# Health check
curl http://localhost:5000/health

# API info
curl http://localhost:5000/api/v1/info

# Login (test credentials from mock)
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin"}'

# Get EC2 instances (requires auth token)
curl http://localhost:5000/api/v1/resources/ec2 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Part 5: Docker Deployment

### 5.1 Build Docker Images

```bash
# Backend
docker build -f Dockerfile.backend -t consolesensei:backend .

# Frontend  
docker build -f Dockerfile.frontend -t consolesensei:frontend .

# Test images
docker images | grep consolesensei
```

### 5.2 Run with Docker Compose

```bash
# Development
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.prod.yml up

# With logs
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### 5.3 Access Application

- Frontend: http://localhost:80
- Backend API: http://localhost:80/api
- Health: http://localhost:80/health

---

## Part 6: Authentication Flow

### 6.1 User Login

1. Frontend sends credentials to `/api/v1/auth/login`
2. Backend validates against user database
3. Returns JWT access token + refresh token
4. Frontend stores in localStorage
5. Subsequent requests include JWT in Authorization header

### 6.2 Token Refresh

1. Access token expires (24 hours)
2. API client detects 401 response
3. Automatically sends refresh token to `/api/v1/auth/refresh`
4. Backend validates refresh token, returns new access token
5. Retry original request with new token

### 6.3 Permission Checking

```typescript
// Frontend
import { useAuth } from '@/hooks/use-auth';

function MyComponent() {
  const { hasPermission, hasRole } = useAuth();
  
  if (hasPermission('resource:modify')) {
    // Show modify button
  }
  
  if (hasRole('admin')) {
    // Show admin panel
  }
}
```

```python
# Backend
from middleware import require_permission, require_jwt

@app.route('/api/v1/admin/settings', methods=['POST'])
@require_jwt
@require_permission('admin:write')
def update_settings():
    # Only users with admin:write permission can access
    pass
```

---

## Part 7: Testing

### 7.1 Frontend Tests

```bash
# Run vitest
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### 7.2 Backend Tests

```bash
cd backend

# Run pytest
pytest tests/ -v

# With coverage
pytest tests/ --cov=. --cov-report=html

# Specific test
pytest tests/test_api.py::TestHealthEndpoints::test_health_check -v
```

### 7.3 E2E Tests

```bash
# Run Playwright/Cypress
npm run test:e2e

# UI mode
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

---

## Part 8: Troubleshooting

### Backend Issues

| Issue | Solution |
|-------|----------|
| Port 5000 already in use | `PORT=8000 python api.py` or kill process |
| Import errors | `pip install -r requirements.txt` |
| JWT errors | Verify JWT_SECRET_KEY in .env |
| AWS credential errors | Check AWS credentials in .env |
| CORS errors | Verify ALLOWED_ORIGINS in .env |

### Frontend Issues

| Issue | Solution |
|-------|----------|
| Module not found | `npm install && npm install --save typescript` |
| Port 5173 in use | `npm run dev -- --port 3000` |
| API 404 errors | Verify backend is running on port 5000 |
| CORS blocked | Check VITE_API_URL in .env.local |
| Auth token issues | Clear localStorage, re-login |

### Docker Issues

| Issue | Solution |
|-------|----------|
| Container exit | `docker-compose logs service-name` |
| Port already in use | Change port in docker-compose |
| Build failures | `docker-compose build --no-cache` |
| Network issues | Ensure services on same network |

---

## Part 9: Production Deployment

### 9.1 AWS EC2 Deployment

```bash
# SSH into EC2 instance
ssh -i key.pem ec2-user@instance-ip

# Clone repository
git clone https://github.com/yourusername/consolesensei.git
cd consolesensei

# Setup environment
sudo docker-compose -f docker-compose.prod.yml up -d

# Enable SSL with Let's Encrypt
sudo certbot certonly --standalone -d yourdomain.com

# Update nginx config with SSL cert paths
```

### 9.2 Vercel Deployment (Frontend)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# VITE_API_URL=https://api.yourdomain.com
```

### 9.3 Railway/Heroku Deployment (Backend)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy backend
railway up -f Dockerfile.backend
```

### 9.4 GitHub Actions CI/CD

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: npm test && pytest

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to production
        run: |
          docker-compose -f docker-compose.prod.yml up -d
```

---

## Part 10: Monitoring & Maintenance

### 10.1 Logs

```bash
# Backend logs
docker-compose logs backend -f

# Frontend logs
docker-compose logs frontend -f

# Nginx logs
docker-compose logs nginx -f
```

### 10.2 Metrics

```bash
# Health check
curl http://localhost:5000/health

# API info
curl http://localhost:5000/api/v1/info

# Performance
curl -i http://localhost:5000/api/v1/resources/ec2 | grep X-Response-Time-MS
```

### 10.3 Updates

```bash
# Update dependencies
npm update && pip install -U -r requirements.txt

# Update Docker images
docker pull ubuntu:latest && docker-compose build --no-cache

# Database migrations (if using Supabase)
# Manual migrations through Supabase UI
```

---

## Part 11: Security Checklist

- [ ] JWT_SECRET_KEY changed from default
- [ ] ENCRYPTION_KEY generated and stored securely
- [ ] AWS credentials have minimal IAM permissions
- [ ] ALLOWED_ORIGINS restricted to known domains
- [ ] SSL/TLS enabled in production
- [ ] Database backups configured
- [ ] Audit logging enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] SQL injection protection verified
- [ ] XSS protection headers added
- [ ] CSRF tokens implemented

---

## Part 12: Performance Optimization

### Frontend
- [ ] Code splitting implemented
- [ ] Lazy loading for routes
- [ ] Image optimization
- [ ] Gzip compression enabled
- [ ] Caching strategy configured

### Backend
- [ ] Database query optimization
- [ ] Connection pooling configured
- [ ] Caching layer (Redis) added
- [ ] API pagination implemented
- [ ] Rate limiting configured

### Infrastructure
- [ ] CDN configured
- [ ] Load balancing setup
- [ ] Auto-scaling configured
- [ ] Monitoring alerts enabled

---

## Summary

**Key Implementation Points:**
1. Backend runs on port 5000 with Flask
2. Frontend runs on port 5173 with Vite + React
3. Docker provides containerized deployment
4. JWT authentication with token refresh
5. RBAC with permissions and roles
6. Environment-based configuration
7. Comprehensive testing suite
8. Production-ready deployment

**Next Steps:**
1. Start backend: `python api.py`
2. Start frontend: `npm run dev`
3. Login with test credentials
4. Test API endpoints
5. Run tests: `npm test && pytest`
6. Deploy with Docker Compose

**Support & Documentation:**
- API Docs: http://localhost:5000/api/v1/info
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

---

**Status**: ✅ Complete Implementation Ready for Production
