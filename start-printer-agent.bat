@echo off
title BD HOSTT POS DEMO - Local Thermal Printer Bridge Agent
color 0A
setlocal enabledelayedexpansion
cd /d "%~dp0"
cls
echo ================================================================
echo    BD HOSTT POS DEMO - LOCAL THERMAL PRINTER BRIDGE AGENT
echo ================================================================
echo.
echo  Primary Printer : 80 Printer (192.168.1.87 - LAN)
echo  Secondary Fallback: Kot Printer (USB001 - Direct Hardware)
echo.

:: Detect target URL strictly from .env or CLI Argument
set "CLOUD_URL="
if exist "%~dp0.env" (
    for /f "usebackq tokens=1,2 delims==" %%a in ("%~dp0.env") do (
        if /i "%%a"=="APP_URL" set "CLOUD_URL=%%~b"
    )
)
if "!CLOUD_URL!"=="" if exist "%~dp0..\.env" (
    for /f "usebackq tokens=1,2 delims==" %%a in ("%~dp0..\.env") do (
        if /i "%%a"=="APP_URL" set "CLOUD_URL=%%~b"
    )
)
if "!CLOUD_URL!"=="" if not "%~1"=="" set "CLOUD_URL=%~1"
if "!CLOUD_URL!"=="" set "CLOUD_URL=http://localhost:3000"

:: Strip quotes
set CLOUD_URL=!CLOUD_URL:"=!
if "!CLOUD_URL:~-1!"=="/" set "CLOUD_URL=!CLOUD_URL:~0,-1!"

echo  Connected Server: !CLOUD_URL!
echo.
echo ================================================================
echo  DO NOT CLOSE THIS WINDOW while operating the BD HOSTT POS!
echo  All prints from !CLOUD_URL! will come here.
echo ================================================================
echo.

:agent_loop
node print-agent.cjs "!CLOUD_URL!"
echo.
echo [WARNING] Printer bridge disconnected or exited.
echo [RETRY] Reconnecting in 3 seconds...
timeout /t 3 /nobreak >nul
goto agent_loop
