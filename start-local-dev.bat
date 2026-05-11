@echo off
REM Quick Start Script for Console Sensei Cloud Ops - Windows

echo.
echo ====== Console Sensei Cloud Ops - Local Development Setup ======
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    exit /b 1
)

echo Node.js version:
node --version

echo Python version:
python --version

echo.
echo Installing frontend dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Frontend installation failed
    exit /b 1
)

echo.
echo Installing backend dependencies...
cd backend

if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)

echo Activating virtual environment and installing packages...
call venv\Scripts\activate
pip install -r requirements.txt

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Backend installation failed
    exit /b 1
)

echo.
echo ====== Setup Complete! ======
echo.
echo Next steps:
echo.
echo 1. Configure environment variables:
echo    - Edit .env.local (frontend)
echo    - Edit backend\.env (add ANTHROPIC_API_KEY)
echo.
echo 2. Start backend server:
echo    cd backend
echo    venv\Scripts\activate
echo    python api.py
echo.
echo 3. Start frontend server (new terminal):
echo    npm run dev
echo.
echo 4. Open http://localhost:5173 in your browser
echo.
