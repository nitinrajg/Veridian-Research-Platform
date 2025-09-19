@echo off
REM ========================================
REM Quick Start ML Backend (No Dependency Check)
REM ========================================

echo.
echo ==========================================
echo 🚀 Quick Start ML Backend
echo ==========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found! Please run start_ml_backend.bat first
    pause
    exit /b 1
)

echo ✅ Starting ML Search API Server...
echo Server: http://127.0.0.1:5000
echo Documentation: http://127.0.0.1:5000/api/docs
echo.
echo Press Ctrl+C to stop the server
echo ==========================================
echo.

cd ..
cd backend
python api_server.py

echo.
echo 👋 Server stopped
pause