@echo off
setlocal

cd /d "%~dp0"
color 0B
echo ========================================
echo   Starting Learning Intelligence Engine
echo ========================================
echo.

if exist "apps\backend\.venv\Scripts\activate.bat" goto launch_backend_dotvenv
if exist "apps\backend\venv\Scripts\activate.bat" goto launch_backend_venv

color 0C
echo [ERROR] No backend virtual environment was found.
echo Expected apps\backend\.venv or apps\backend\venv.
pause
exit /b 1

:launch_backend_dotvenv
echo [OK] Launching FastAPI Backend with .venv...
start "FastAPI Backend" /D "%~dp0apps\backend" cmd /k "call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
goto launch_frontend

:launch_backend_venv
echo [OK] Launching FastAPI Backend with venv...
start "FastAPI Backend" /D "%~dp0apps\backend" cmd /k "call venv\Scripts\activate.bat && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

:launch_frontend
echo [OK] Launching Vite Frontend...
start "Vite Frontend" /D "%~dp0apps\frontend" cmd /k "npm run dev"

echo [OK] Waiting for both servers to initialize...
timeout /t 5 /nobreak >nul

echo [OK] Opening local development URLs...
start "" "http://localhost:5173"
start "" "http://127.0.0.1:8000/docs"

echo.
echo Launch commands dispatched. Keep both terminal windows open.
endlocal