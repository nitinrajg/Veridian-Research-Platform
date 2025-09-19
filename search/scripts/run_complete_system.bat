@echo off
REM ========================================
REM Complete ML-Enhanced Search System Setup
REM ========================================

echo.
echo ==========================================
echo 🧬 ML-Enhanced Search System Setup
echo ==========================================
echo.

echo This script will:
echo   1. ✅ Check Python installation
echo   2. 📦 Install required dependencies
echo   3. 🚀 Start the ML backend server
echo   4. 🌐 Open your website
echo.

set /p continue="Do you want to continue? (Y/N): "
if /i not "%continue%"=="Y" (
    echo Setup cancelled.
    pause
    exit /b 0
)

echo.
echo ==========================================
echo Step 1: Checking Python Installation
echo ==========================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo.
    echo Please install Python 3.7 or higher from:
    echo https://python.org/downloads
    echo.
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

python --version
echo ✅ Python is available
echo.

echo ==========================================
echo Step 2: Installing Dependencies
echo ==========================================
echo.

echo 📦 Upgrading pip...
python -m pip install --upgrade pip

echo 📦 Installing required packages...
python -m pip install -r ..\backend\requirements.txt

if errorlevel 1 (
    echo ❌ Failed to install dependencies
    echo Please check your internet connection and try again
    pause
    exit /b 1
)

echo ✅ All dependencies installed successfully
echo.

echo ==========================================
echo Step 3: Starting ML Backend Server
echo ==========================================
echo.

echo 🚀 Starting the ML backend server in a new window...
echo.

REM Start backend in new window
start "ML Backend Server - DO NOT CLOSE" cmd /c "cd ..\backend && python api_server.py --host 127.0.0.1 --port 5000 & pause"

echo ⏳ Waiting for backend to initialize (10 seconds)...
timeout /t 10 /nobreak >nul

echo 🔍 Testing backend connection...
curl -s http://127.0.0.1:5000/health >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend server failed to start properly
    echo Please check the server window for error messages
    pause
    exit /b 1
)

echo ✅ Backend server is running successfully!
echo.

echo ==========================================
echo Step 4: Opening Website
echo ==========================================
echo.

REM Look for HTML files
if exist "..\frontend\html\*.html" (
    echo ✅ Found HTML files - opening website...
    echo.
    for %%f in (..\frontend\html\*.html) do (
        echo 🌐 Opening: %%f
        start "" "%%f"
    )
) else (
    echo ⚠️ No HTML files found in frontend\html directory
    echo Please manually open your HTML file in a web browser
)

echo.
echo ==========================================
echo ✅ Setup Complete!
echo ==========================================
echo.
echo Your ML-Enhanced Search System is now running:
echo.
echo 🔧 Backend Server: http://127.0.0.1:5000
echo 📋 API Documentation: http://127.0.0.1:5000/api/docs
echo 🏥 Health Check: http://127.0.0.1:5000/health
echo.
echo 🌐 Website: Should be open in your browser
echo.
echo 💡 Features Available:
echo   - ✅ ML-Enhanced Query Processing
echo   - ✅ Smart PubMed Search Integration  
echo   - ✅ Real-time Search Analytics
echo   - ✅ Automatic Fallback (works offline too)
echo.
echo ⚠️ IMPORTANT: Keep the "ML Backend Server" window open
echo                 to maintain ML functionality
echo.
echo Press any key to finish setup...
pause >nul

echo.
echo 🎉 Enjoy your enhanced search experience!
echo.
pause