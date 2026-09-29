@echo off
title BD HOSTT POS - Local Thermal Printer Bridge Agent (80 Printer LAN 192.168.1.87)
color 0A
cd /d "%~dp0"
cls
echo ================================================================
echo    BD HOSTT POS - LOCAL THERMAL PRINTER BRIDGE AGENT
echo ================================================================
echo.
echo  Primary Printer : 80 Printer (192.168.1.87 - LAN)
echo  Secondary Fallback: Kot Printer (USB001 - Direct Hardware)
echo.
set CLOUD_URL=https://tsc-cafeteria.onrender.com
if not "%~1"=="" set CLOUD_URL=%~1
echo  Cloud Target    : %CLOUD_URL%
echo.
echo ================================================================
echo  DO NOT CLOSE THIS WINDOW while operating the BD HOSTT POS!
echo  All prints from %CLOUD_URL% will come here.
echo ================================================================
echo.

:agent_loop
node print-agent.cjs "%CLOUD_URL%"
echo.
echo [WARNING] Printer bridge disconnected or exited.
echo [RETRY] Reconnecting in 3 seconds...
timeout /t 3 /nobreak >nul
goto agent_loop
