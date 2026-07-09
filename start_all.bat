@echo off
REM PULSE 2.0 - Start All Components
REM This script opens 3 terminals for backend, frontend, and PWA

echo ========================================
echo PULSE 2.0 - Starting All Components
echo ========================================
echo.

REM Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip
set LOCAL_IP=%LOCAL_IP: =%
echo Your laptop IP: %LOCAL_IP%
echo.

echo Opening 3 terminals:
echo   1. Backend (Python FastAPI)
echo   2. Frontend (Next.js Dashboard)
echo   3. PWA (Expo Dev Server)
echo.
echo IMPORTANT: Configure these URLs:
echo   - PWA Setup Screen: https://%LOCAL_IP%:8000
echo   - Frontend .env.local: NEXT_PUBLIC_PULSE_API_URL=https://%LOCAL_IP%:8000
echo.
pause

REM Terminal 1: Backend
start "PULSE Backend" cmd /k "cd backend && venv\Scripts\activate && python run_https.py"

REM Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

REM Terminal 2: Frontend
start "PULSE Frontend" cmd /k "cd frontend && npm run dev"

REM Terminal 3: PWA
start "PULSE PWA" cmd /k "cd PWA && npx expo start"

echo.
echo ========================================
echo All components starting...
echo ========================================
echo.
echo Next steps:
echo   1. Wait for all 3 terminals to finish loading
echo   2. Open browser: http://localhost:3000 (dashboard)
echo   3. Scan QR code with Expo Go on phone (PWA)
echo   4. In PWA Setup screen, enter: https://%LOCAL_IP%:8000
echo.
echo Press any key to exit this window (components will keep running)
pause >nul
