@echo off
chcp 65001 >nul
echo ========================================
echo   Firebase Hosting Deploy Script
echo   Isra University Booking System
echo ========================================
echo.

REM Check if firebase-tools is installed
where firebase >nul 2>&1
if errorlevel 1 (
    echo Installing Firebase CLI...
    npm install -g firebase-tools
    echo.
)

echo Step 1: Login to Firebase
echo (A browser window will open - sign in with your Google account)
echo.
firebase login

echo.
echo Step 2: Deploying to Firebase Hosting...
echo.
firebase deploy --only hosting

echo.
echo ========================================
echo   DEPLOYMENT COMPLETE!
echo   Your site is live at:
echo   https://new-booking-web.web.app
echo ========================================
echo.
pause
