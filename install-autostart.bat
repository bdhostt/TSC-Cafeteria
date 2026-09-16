@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { & '%~dp0scripts\setup-autostart.ps1' }"
pause
