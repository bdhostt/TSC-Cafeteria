@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { & '%~dp0scripts\stop-agent.ps1'; & '%~dp0scripts\remove-autostart.ps1' }"
pause
