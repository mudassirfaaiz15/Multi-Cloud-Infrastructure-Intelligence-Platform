# CONSOLE SENSEI CLOUD OPS

<div align="center">

![AWS](https://img.shields.io/badge/AWS-Cloud%20Operations-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-Backend-000000?style=for-the-badge&logo=flask&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployment-Vercel-black?style=for-the-badge&logo=vercel)
![Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?style=for-the-badge&logo=railway)
![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

# CONSOLE SENSEI CLOUD OPS

### Enterprise-Grade Multi-Cloud Infrastructure Intelligence Platform

Monitor AWS infrastructure, analyze cloud costs, detect security risks, and manage multi-account environments from one intelligent dashboard.

<br>

[🌐 Live Application](https://multi-cloud-infrastructure-intellig-sage.vercel.app/) •
[📂 GitHub Repository](https://github.com/mudassirfaaiz15/Multi-Cloud-Infrastructure-Intelligence-Platform)

</div>

---

# 📌 Overview

**CONSOLE SENSEI CLOUD OPS** is a modern SaaS-based cloud operations platform engineered for DevOps teams, cloud engineers, startups, and enterprises managing large-scale AWS environments.

The platform provides centralized infrastructure visibility, real-time cost intelligence, security auditing, compliance monitoring, and operational analytics across multiple AWS accounts and regions.

Built using **React 18 + TypeScript** on the frontend and **Flask + boto3** on the backend, the platform delivers enterprise-grade cloud management capabilities without the complexity and pricing overhead of traditional FinOps platforms.

---

# ✨ Core Features

- 🔍 AWS Resource Discovery & Inventory
- 💰 Real-Time Cost Intelligence Dashboard
- 🛡️ IAM Security & Compliance Auditing
- 📊 Multi-Account Cloud Management
- 📈 CloudTrail Activity Monitoring
- 🚨 Intelligent Alerting System
- 👥 Team Collaboration & RBAC
- 📄 PDF & CSV Export Reports
- ⚡ Real-Time Infrastructure Visibility
- 🎯 Idle Resource Detection
- 🔐 JWT + API Key Authentication
- 🌍 Multi-Region AWS Support

---

# 🚨 Problem Statement

Engineering and DevOps teams managing AWS environments often lack a lightweight and unified platform capable of simultaneously:

- Monitoring cloud infrastructure
- Tracking cloud spending
- Auditing IAM security
- Managing multiple AWS accounts
- Detecting idle resources
- Visualizing operational activity

Most enterprise solutions are expensive, difficult to configure, and overloaded with unnecessary complexity.

---

# 💡 Proposed Solution

CONSOLE SENSEI CLOUD OPS provides a unified cloud intelligence dashboard that:

- Automatically scans AWS resources
- Tracks cloud costs in real time
- Detects security vulnerabilities
- Audits IAM policies
- Monitors CloudTrail activity
- Provides optimization recommendations
- Supports role-based collaboration

The platform is deployable within minutes using **Vercel** and **Railway** while maintaining enterprise-grade scalability and security practices.

---

# 🏗️ System Architecture

```text
 ┌───────────────────────────────┐
 │        React Frontend         │
 │  React 18 + TypeScript + UI  │
 └──────────────┬────────────────┘
                │ REST API Calls
                ▼
 ┌───────────────────────────────┐
 │         Flask Backend         │
 │   Authentication + boto3 API │
 └──────────────┬────────────────┘
                │
                ▼
 ┌───────────────────────────────┐
 │        AWS Cloud Layer        │
 │ EC2 │ RDS │ S3 │ Lambda │ IAM │
 │ CloudTrail │ Security Hub     │
 └───────────────────────────────┘
```

---

# 🏛️ Infrastructure Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                 CONSOLE SENSEI CLOUD OPS               │
├─────────────────────────────────────────────────────────┤
│ Frontend Layer                                         │
│ ├─ React 18 SPA                                        │
│ ├─ Dashboard Components                                │
│ ├─ Security Monitoring UI                              │
│ ├─ Cost Analytics & Charts                             │
│ └─ Team Management Modules                             │
├─────────────────────────────────────────────────────────┤
│ Backend Layer                                          │
│ ├─ Flask REST APIs                                     │
│ ├─ Authentication Engine                               │
│ ├─ Resource Scanner                                    │
│ ├─ Cost Optimization Engine                            │
│ └─ Activity Monitoring Services                        │
├─────────────────────────────────────────────────────────┤
│ AWS Integration Layer                                  │
│ ├─ EC2                                                 │
│ ├─ RDS                                                 │
│ ├─ S3                                                  │
│ ├─ Lambda                                              │
│ ├─ IAM                                                 │
│ ├─ CloudTrail                                          │
│ ├─ Security Hub                                        │
│ └─ 13+ AWS Services                                    │
├─────────────────────────────────────────────────────────┤
│ Deployment & DevOps                                    │
│ ├─ Vercel Deployment                                   │
│ ├─ Railway Backend Hosting                             │
│ ├─ GitHub Actions CI/CD                                │
│ └─ Environment Configuration                           │
└─────────────────────────────────────────────────────────┘
```

---

# ⚙️ Functional Requirements

## 🔐 Authentication

- JWT-based authentication system
- Secure login & registration
- Logout functionality
- Token refresh handling
- API key authentication
- Role-based access control
  - Admin
  - Editor
  - Viewer
- Secure session management

---

## ☁️ AWS Account Management

- Connect multiple AWS accounts
- Multi-region cloud monitoring
- Add/Edit/Delete cloud accounts
- Unified cloud dashboard
- Centralized account management
- Cross-account visibility

---

## 🔍 Resource Discovery

Automatically scans:

- EC2
- RDS
- S3
- Lambda
- IAM
- CloudTrail
- Security Hub

### Features

- Auto resource scanning
- Infrastructure inventory generation
- Resource filtering
- Region-based filtering
- Idle resource detection
- Unused resource identification
- Real-time cloud visibility

---

## 💰 Cost Intelligence

- Real-time cost analytics
- Cost breakdown by:
  - Service
  - Region
  - AWS Account
- Budget threshold alerts
- Cost optimization recommendations
- Cloud spending visualization
- Usage trend analysis

### Export Support

- PDF Reports
- CSV Reports

---

## 🛡️ Security & Compliance

- IAM policy analysis
- Over-permission detection
- Compliance monitoring
- Security audit score (0–100)
- Security posture visualization
- Risk detection engine
- Vulnerability visibility

---

## 📈 Activity Monitoring

- CloudTrail integration
- Infrastructure activity logs
- User activity tracking
- Event monitoring
- Operational visibility

### Filters

- Service
- User
- Time Range

---

## 🚨 Alerts & Notifications

- Cost spike alerts
- Resource utilization alerts
- Security incident alerts
- Email notifications
- In-app notifications
- Automated monitoring triggers

---

## 👥 Team Management

- Invite team members
- Assign team roles
- Remove members
- Permission management
- Collaborative cloud operations

---

## 📄 Reports & Analytics

- Monthly cost reports
- Security reports
- Operational analytics
- PDF exports
- CSV exports
- Shareable report links

---

# 🚀 Non-Functional Requirements

| Requirement | Target |
|---|---|
| Bundle Size | Under 150 KB gzipped |
| Page Load Time | Under 2 seconds |
| API Response Time | Under 3 seconds |
| Concurrent Users | 50+ |
| Uptime | 99.5% |
| Encryption | HTTPS/TLS |
| Accessibility Score | Lighthouse 90+ |
| Test Coverage | Minimum 70% |

---

# 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| UI Components | Radix UI |
| Charts | Recharts |
| Forms | React Hook Form |
| Validation | Zod |
| State Management | React Query |
| Backend | Flask |
| Cloud SDK | boto3 |
| Database | Supabase |
| Authentication | JWT |
| Deployment | Vercel + Railway |
| CI/CD | GitHub Actions |
| Build Tool | Vite 6 |

---

# 📂 Project Structure

```text
ConsoleSensei-Cloud/
│
├── src/
│   ├── app/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── routes.tsx
│   │   └── App.tsx
│   │
│   ├── lib/
│   │   ├── api/
│   │   ├── aws/
│   │   ├── hooks/
│   │   ├── export-utils.ts
│   │   └── pdf-export.ts
│   │
│   ├── providers/
│   ├── services/
│   ├── styles/
│   ├── hooks/
│   ├── types/
│   └── main.tsx
│
├── backend/
│   ├── api.py
│   ├── aws_resource_scanner.py
│   ├── resource_manager.py
│   ├── requirements.txt
│   └── config.py
│
├── public/
├── .github/workflows/
├── vercel.json
├── package.json
└── README.md
```

---

# 🚀 Quick Start

## Prerequisites

- Node.js 18+
- Python 3.9+
- AWS Account
- npm / yarn / pnpm

---

## Installation

### Clone Repository

```bash
git clone https://github.com/mudassirfaaiz15/Multi-Cloud-Infrastructure-Intelligence-Platform.git
cd Multi-Cloud-Infrastructure-Intelligence-Platform
```

---

## Frontend Setup

```bash
npm install
```

Create environment variables:

```env
VITE_API_URL=http://localhost:5000
```

---

## Backend Setup

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
```

---

## Run Development Servers

### Frontend

```bash
npm run dev
```

### Backend

```bash
python api.py
```

---

# 🌐 Live Deployment

| Service | URL |
|---|---|
| Frontend | https://multi-cloud-infrastructure-intellig-sage.vercel.app/ |
| Backend | Railway Hosted Flask API |

---

# 📈 Performance Optimizations

- Code Splitting
- Lazy Loading
- Tree Shaking
- Minification
- React Suspense
- Optimized API Fetching
- Tailwind CSS Purging
- Bundle Compression

---

# 🔒 Security Features

- JWT Authentication
- HTTPS/TLS Encryption
- Secure Credential Handling
- Role-Based Access Control
- API Key Authentication
- Protected API Routes
- Token Expiry Management
- Input Validation with Zod

---

# 🧪 Testing

```bash
npm test
npm run test:coverage
```

### Test Coverage Includes

- Component Testing
- API Testing
- Hook Testing
- Page Testing
- Authentication Validation

---

# 🚢 Deployment

## Frontend Deployment

```bash
npm run build
vercel --prod
```

---

## Backend Deployment

```bash
railway up
```

---

# 📚 Documentation

- API Documentation
- Deployment Guide
- CI/CD Setup
- AWS Integration Guide
- Frontend Architecture Docs

---

# 📊 Key Highlights

- Enterprise-grade AWS intelligence platform
- Real-time cloud monitoring
- FinOps cost optimization
- IAM security auditing
- CloudTrail analytics
- Multi-account AWS visibility
- SaaS-ready architecture
- Production-ready deployment
- Scalable backend services
- Modern responsive UI

---

# 🏁 Conclusion

**CONSOLE SENSEI CLOUD OPS** is a scalable cloud operations intelligence platform designed to simplify AWS infrastructure management for modern DevOps teams.

The platform combines:

- Infrastructure visibility
- Security auditing
- FinOps analytics
- Operational monitoring
- Team collaboration
- Real-time cloud intelligence

It demonstrates strong engineering practices, scalable architecture, and enterprise-grade AWS integration capabilities.

---

# 👨‍💻 Developed By

## Mudassir Faaiz Mohammed

### Cloud • DevOps • Full Stack • AWS

---

# ⭐ Support

If you found this project useful:

- ⭐ Star the repository
- 🍴 Fork the project
- 🛠️ Contribute improvements
- 🐛 Report issues
- 📢 Share feedback

---

<div align="center">

# CONSOLE SENSEI CLOUD OPS

### Intelligent Cloud Operations Platform for Modern DevOps Teams

<br>

## ❤️ Made With Love By Mudassir Faaiz ❤️

<br>

⭐ If you found this project helpful, consider giving it a star!

</div>
