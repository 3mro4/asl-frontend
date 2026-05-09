@echo off
setlocal

set BACKEND_DIR=d:\Code\Project\asl-backend
set FRONTEND_DIR=d:\Code\Project\asl-frontend
set VENV_ACTIVATE=%BACKEND_DIR%\.venv\Scripts\activate.bat
set BACKEND_URL=http://localhost:8000/health
set FRONTEND_URL=http://localhost:4200

echo ============================================
echo   ASL Translator - Starting up
echo ============================================
echo.

:: ── Check virtual environment ────────────────────────────
if not exist "%VENV_ACTIVATE%" (
    echo [ERROR] Python virtual environment not found at:
    echo         %BACKEND_DIR%\.venv
    echo.
    echo To create it, run:
    echo   cd /d %BACKEND_DIR%
    echo   python -m venv .venv
    echo   .venv\Scripts\activate
    echo   pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

:: ── Check Node / npm ─────────────────────────────────────
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found. Install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: ── Check Angular CLI ────────────────────────────────────
if not exist "%FRONTEND_DIR%\node_modules" (
    echo [INFO] node_modules not found - running npm install...
    cd /d "%FRONTEND_DIR%"
    npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    echo.
)

:: ── Start backend ────────────────────────────────────────
echo [1/2] Starting backend on port 8000...
start "ASL Backend" cmd /k "cd /d %BACKEND_DIR% && call .venv\Scripts\activate && uvicorn main:app --port 8000 --reload"

:: ── Wait for backend to be ready ─────────────────────────
echo      Waiting for backend to be ready...
set /a TRIES=0
:wait_backend
set /a TRIES+=1
if %TRIES% gtr 20 (
    echo [WARN] Backend did not respond after 20s - starting frontend anyway.
    goto start_frontend
)
timeout /t 2 /nobreak >nul
curl -s -o nul -w "%%{http_code}" %BACKEND_URL% 2>nul | findstr "200" >nul
if errorlevel 1 goto wait_backend
echo      Backend is ready.

:: ── Start frontend ───────────────────────────────────────
:start_frontend
echo.
echo [2/2] Starting frontend on port 4200...
start "ASL Frontend" cmd /k "cd /d %FRONTEND_DIR% && npx ng serve"

:: ── Wait then open browser ───────────────────────────────
echo      Waiting for Angular to compile...
timeout /t 15 /nobreak >nul
echo.
echo ============================================
echo   Opening %FRONTEND_URL%
echo ============================================
start %FRONTEND_URL%

endlocal
