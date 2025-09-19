@echo off
REM ========================================
REM ML-Enhanced Search Backend Startup
REM ========================================

echo.
echo ==========================================
echo 🧬 ML-Enhanced Search Backend Startup
echo ==========================================
echo.

REM Check if Python is installed
echo 🔍 Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.7 or higher from https://python.org
    pause
    exit /b 1
)

python --version
echo ✅ Python is available
echo.

REM Install dependencies
echo 📦 Installing Python dependencies...
python -m pip install --upgrade pip
python -m pip install -r ..\backend\requirements.txt

if errorlevel 1 (
    echo ❌ Failed to install dependencies
    echo Please check your internet connection and try again
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully
echo.

REM Start the server
echo 🚀 Starting ML Search API Server...
echo.
echo The server will start on: http://127.0.0.1:5000
echo API Documentation: http://127.0.0.1:5000/api/docs
echo Health Check: http://127.0.0.1:5000/health
echo.
echo Press Ctrl+C to stop the server
echo ==========================================
echo.

REM Start the Python backend
cd ..
cd backend
python simple_api_server.py

echo.
echo 👋 Server stopped
pause