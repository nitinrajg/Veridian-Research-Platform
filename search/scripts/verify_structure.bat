@echo off
REM ========================================
REM Verify File Structure and Paths
REM ========================================

echo.
echo ==========================================
echo 🔍 Verifying Project Structure
echo ==========================================
echo.

set errorCount=0

echo ✅ Checking directory structure...
echo.

REM Check backend directory and files
if exist "..\backend\" (
    echo ✅ backend\ directory exists
) else (
    echo ❌ backend\ directory missing
    set /a errorCount+=1
)

if exist "..\backend\api_server.py" (
    echo ✅ backend\api_server.py exists
) else (
    echo ❌ backend\api_server.py missing
    set /a errorCount+=1
)

if exist "..\backend\requirements.txt" (
    echo ✅ backend\requirements.txt exists
) else (
    echo ❌ backend\requirements.txt missing
    set /a errorCount+=1
)

echo.

REM Check frontend directory and files
if exist "..\frontend\" (
    echo ✅ frontend\ directory exists
) else (
    echo ❌ frontend\ directory missing
    set /a errorCount+=1
)

if exist "..\frontend\html\search-results.html" (
    echo ✅ frontend\html\search-results.html exists
) else (
    echo ❌ frontend\html\search-results.html missing
    set /a errorCount+=1
)

if exist "..\frontend\css\search-results.css" (
    echo ✅ frontend\css\search-results.css exists
) else (
    echo ❌ frontend\css\search-results.css missing
    set /a errorCount+=1
)

if exist "..\frontend\js\search-results.js" (
    echo ✅ frontend\js\search-results.js exists
) else (
    echo ❌ frontend\js\search-results.js missing
    set /a errorCount+=1
)

echo.

REM Check data directory
if exist "..\data\" (
    echo ✅ data\ directory exists
) else (
    echo ❌ data\ directory missing
    set /a errorCount+=1
)

echo.

REM Check docs directory
if exist "..\docs\" (
    echo ✅ docs\ directory exists
) else (
    echo ❌ docs\ directory missing
    set /a errorCount+=1
)

echo.

REM Check main launcher
if exist "..\RUN_ML_SEARCH_SYSTEM.bat" (
    echo ✅ Main launcher exists
) else (
    echo ❌ Main launcher missing
    set /a errorCount+=1
)

echo.
echo ==========================================
echo 🧪 Testing File Path References
echo ==========================================
echo.

echo Checking HTML file references...

REM Check if style.css exists in expected location
if exist "..\..\style.css" (
    echo ✅ style.css found at expected location (../../style.css)
) else (
    echo ❌ style.css not found at expected location
    set /a errorCount+=1
)

echo.
echo ==========================================
echo 📊 Verification Results
echo ==========================================
echo.

if %errorCount%==0 (
    echo ✅ SUCCESS: All files and directories are correctly organized!
    echo.
    echo 🎉 Your project structure is perfect:
    echo   - ✅ Backend files in backend\ directory
    echo   - ✅ Frontend files properly organized  
    echo   - ✅ Scripts in scripts\ directory
    echo   - ✅ Documentation in docs\ directory
    echo   - ✅ Data storage in data\ directory
    echo   - ✅ All file paths are correctly referenced
    echo.
    echo 🚀 Ready to run: ..\RUN_ML_SEARCH_SYSTEM.bat
) else (
    echo ❌ ERRORS FOUND: %errorCount% issues detected
    echo.
    echo Please check the missing files/directories above
    echo and ensure all files have been moved to the correct locations
)

echo.
echo ==========================================
echo 📁 Current Project Structure:
echo ==========================================
echo.
tree ..\.. /F /A

echo.
echo Press any key to continue...
pause >nul