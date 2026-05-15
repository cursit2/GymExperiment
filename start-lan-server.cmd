@echo off
setlocal
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0scripts\start-lan-server.ps1" %*
endlocal
