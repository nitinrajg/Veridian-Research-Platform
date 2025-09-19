@echo off
REM ========================================
REM Open Website with ML Backend
REM ========================================

echo.
echo ==========================================
echo 🌐 Opening Website with ML Backend
echo ==========================================
echo.

REM Check if backend is running
echo 🔍 Checking if ML backend is running...
curl -s http://127.0.0.1:5000/health >nul 2>&1
if errorlevel 1 (
    echo ❌ ML Backend is not running!
    echo.
    echo Would you like to start the backend now? (Y/N)
    set /p choice=
    if /i "%choice%"=="Y" (
        echo 🚀 Starting ML Backend...
        start "ML Backend Server" cmd /c start_ml_backend.bat
        echo.
        echo ⏳ Waiting for backend to start (10 seconds)...
        timeout /t 10 /nobreak >nul
    ) else (
        echo ⚠️ Website will work in local fallback mode without ML enhancements
        echo.
    )
) else (
    echo ✅ ML Backend is running and healthy!
    echo.
)

REM Look for HTML files in the parent directory
echo 🔍 Looking for HTML files...
if exist "..\frontend\html\*.html" (
    echo ✅ Found HTML files in frontend directory
    echo.
    echo 🌐 Opening website files:
    for %%f in (..\frontend\html\*.html) do (
        echo   - %%f
        start "" "%%f"
    )
) else (
    echo ❌ No HTML files found in frontend directory
    echo.
    echo Please make sure your HTML files are in:
    echo   %CD%\..\frontend\html\
    echo.
    echo Or manually open your HTML file in a web browser.
)

echo.
echo 📋 Backend Information:
echo   - API Server: http://127.0.0.1:5000
echo   - API Documentation: http://127.0.0.1:5000/api/docs
echo   - Health Check: http://127.0.0.1:5000/health
echo.
echo 💡 The website will automatically connect to the Python backend
echo    and fall back to local processing if backend is unavailable.
echo.
pause