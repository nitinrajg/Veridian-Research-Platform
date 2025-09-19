@echo off
REM ========================================
REM Test ML Backend Server
REM ========================================

echo.
echo ==========================================
echo 🧪 Testing ML Backend Server
echo ==========================================
echo.

echo 🔍 Testing server health check...
echo.

REM Test health endpoint
curl -s http://127.0.0.1:5000/health
if errorlevel 1 (
    echo ❌ Server is not running or not accessible
    echo.
    echo Please make sure the server is started by running:
    echo   start_ml_backend.bat
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Server is running and healthy!
echo.

echo 🔍 Testing ML query processing...
echo.

REM Test ML query endpoint
curl -X POST http://127.0.0.1:5000/api/ml/process-query ^
     -H "Content-Type: application/json" ^
     -d "{\"query\": \"diabetes treatment\"}"

echo.
echo.

echo 🔍 Testing analytics endpoint...
echo.

REM Test analytics endpoint
curl -s http://127.0.0.1:5000/api/analytics/summary

echo.
echo.

echo ✅ Backend testing completed!
echo.
echo Available endpoints:
echo   - Health Check: http://127.0.0.1:5000/health
echo   - API Docs: http://127.0.0.1:5000/api/docs  
echo   - ML Processing: http://127.0.0.1:5000/api/ml/process-query
echo   - Enhanced Search: http://127.0.0.1:5000/api/search/enhanced
echo   - Analytics: http://127.0.0.1:5000/api/analytics/summary
echo.
pause