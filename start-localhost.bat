@echo off
title CAFE BANANI POS - Localhost (http://localhost:3000)
color 0B
cd /d "%~dp0"
cls

echo ================================================================
echo       CAFE BANANI / BD HOSTT POS - LOCALHOST SERVER
echo ================================================================
echo.
echo Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm install
)

echo.
echo [INFO] Server starting at: http://localhost:3000
echo [INFO] Opening default browser...
start "" http://localhost:3000

echo.
echo ================================================================
echo Server is running! Keep this window open. Press Ctrl+C to stop.
echo ================================================================
echo.

node --import tsx server.ts
pause
