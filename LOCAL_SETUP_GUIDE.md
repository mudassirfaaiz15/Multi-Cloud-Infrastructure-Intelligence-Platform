# Local Development Setup Guide

## Overview
This guide will help you run the Console Sensei Cloud Ops application locally with both frontend and backend servers.

## Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- pip (Python package manager)
- An Anthropic API key (for Claude AI features)

## Directory Structure
```
Console Sensei Cloud Ops/
├── frontend files (React + Vite)
├── backend/              (Flask API)
├── .env.local           (Frontend environment variables)
├── package.json         (Frontend dependencies)
└── tsconfig.json        (TypeScript configuration)
```

## Step 1: Install Frontend Dependencies

```bash
# Navigate to project root
cd e:\Console Sensei Cloud Ops

# Install npm packages
npm install
```

This will install:
- React 18 and React DOM
- TypeScript
- Vite (build tool)
- Tailwind CSS
- @aws-sdk client libraries
- React Query for state management
- And other dependencies

## Step 2: Set Up Frontend Environment Variables

Edit `.env.local` file in the project root:

```env
# API Configuration
VITE_API_URL=http://localhost:5000
VITE_API_KEY=demo-key

# Supabase (if using auth features)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Step 3: Install Backend Dependencies

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python packages
pip install -r requirements.txt
```

## Step 4: Set Up Backend Environment Variables

Edit `backend/.env` file:

```env
FLASK_ENV=development
SECRET_KEY=dev-secret-key-12345
ANTHROPIC_API_KEY=sk-your-actual-api-key-here
AWS_REGION=us-east-1
HOST=localhost
PORT=5000
```

**Important:** Replace `sk-your-actual-api-key-here` with your actual Anthropic API key from https://console.anthropic.com

## Step 5: Start the Backend Server

From the `backend` directory with virtual environment activated:

```bash
# Run Flask development server
python api.py
```

Expected output:
```
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

The backend will be available at `http://localhost:5000`

## Step 6: Start the Frontend Development Server

In a new terminal, from the project root:

```bash
# Start Vite development server
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in xx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

The frontend will be available at `http://localhost:5173`

## Step 7: Access the Application

Open your browser and navigate to: **http://localhost:5173**

You should see the Console Sensei Cloud dashboard with:
- AI Chat Sidebar (using Claude API with fallback to demo mode)
- AWS Resource Dashboard
- Activity Log
- Budget Alerts
- Security Audit findings

## Testing Features

### AI Chat Feature
1. Open the AI Chat sidebar (usually on the right)
2. Ask questions like:
   - "What are my cost drivers?"
   - "Identify anomalies"
   - "What can I save?"
3. Backend calls Claude API, frontend shows response

### Data Pages
All pages have intelligent fallback logic:
- **With Backend:** Fetches real data from APIs
- **Demo Mode:** Shows realistic mock data
- **On Error:** Falls back to demo data automatically

## Environment Variables Reference

### Frontend (.env.local)
| Variable | Default | Purpose |
|----------|---------|---------|
| VITE_API_URL | http://localhost:5000 | Backend API base URL |
| VITE_API_KEY | demo-key | API authentication key |
| VITE_SUPABASE_URL | (optional) | Supabase project URL |
| VITE_SUPABASE_ANON_KEY | (optional) | Supabase anon key |

### Backend (backend/.env)
| Variable | Default | Purpose |
|----------|---------|---------|
| FLASK_ENV | development | Flask environment |
| SECRET_KEY | (required) | Session/cookie secret |
| ANTHROPIC_API_KEY | (required) | Claude API key |
| AWS_REGION | us-east-1 | Default AWS region |
| PORT | 5000 | Server port |

## Troubleshooting

### CORS Error when calling API
- Ensure backend is running on `http://localhost:5000`
- Check `VITE_API_URL` in `.env.local`
- Verify backend has CORS enabled (Flask-CORS should be in requirements)

### AI Chat returns "No API key"
- Check `ANTHROPIC_API_KEY` is set in `backend/.env`
- Verify it's a valid key from Anthropic console
- Restart backend after updating `.env`

### Port Already in Use
```bash
# Change frontend port
npm run dev -- --port 5174

# For Flask backend, change PORT in backend/.env
```

### Module Not Found Errors
```bash
# Frontend
rm -rf node_modules
npm install

# Backend
pip install --upgrade pip
pip install -r requirements.txt
```

## File Structure Generated During Implementation

### New API Layers
- `src/lib/api/ai.ts` - AI service with Claude integration
- `src/hooks/use-ai-service.ts` - React hooks for AI
- `backend/services/ai_usage_monitor.py` - AI query engine

### New AWS Services
- `src/lib/aws/rds-service.ts` - RDS monitoring
- `src/lib/aws/lambda-service.ts` - Lambda functions
- `src/lib/aws/cloudtrail-service.ts` - Audit logging
- `src/lib/aws/security-hub-service.ts` - Security findings

### Updated Components
- `src/app/components/ai-chat-sidebar.tsx` - Real API calls
- `src/app/pages/security-audit-page.tsx` - API integration
- `src/app/pages/activity-log-page.tsx` - API integration
- `src/app/pages/budget-alerts-page.tsx` - API integration

## API Endpoints

### AI Chat
```
POST /api/v1/ai/chat
Content-Type: application/json
X-API-Key: demo-key

{
  "question": "What are my cost drivers?",
  "context": {}
}
```

### AI Usage Stats
```
GET /api/v1/ai/usage?days=30
X-API-Key: demo-key
```

## Demo Mode

The application has built-in demo mode that:
- Returns realistic mock data when backend is unavailable
- Allows testing without valid API keys
- Provides fallback responses for AI chat

Enable demo mode by running without backend API key.

## Next Steps

1. **Deploy Backend**: Follow backend deployment guide (Docker/AWS/Heroku)
2. **Connect AWS Services**: Configure AWS credentials for real data
3. **Production Build**: Run `npm run build` to create optimized bundle
4. **Environment Setup**: Configure production `.env` files

## Need Help?

- Check logs in browser DevTools (F12)
- Check Flask server terminal for API errors
- Review `.env` files for correct configuration
- See error messages in both terminals for debugging

---

**Happy coding!** 🚀

