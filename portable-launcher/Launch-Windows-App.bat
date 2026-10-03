@echo off
setlocal
title ISO System (IMS) - By Osman Khrif

echo ======================================================================
echo  ISO System (IMS) - Standalone Offline Launcher
echo  Author / Publisher: Osman Khrif
echo  Integrated Industrial Management System (ISO 9001 / 14001 / 45001)
echo ======================================================================
echo.

cd /d "%~dp0"

:: Check if Node is available for local offline server
where npx >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Starting lightweight local offline server on port 3000...
    start "" /b npx --yes serve -s dist -l 3000
    timeout /t 2 >nul
    start msedge.exe --app="http://localhost:3000" || start chrome.exe --app="http://localhost:3000" || start http://localhost:3000
    exit /b 0
)

:: Fallback: Try python local offline server
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Starting Python local offline server on port 3000...
    start "" /b python -m http.server 3000 --directory dist
    timeout /t 2 >nul
    start msedge.exe --app="http://localhost:3000" || start chrome.exe --app="http://localhost:3000" || start http://localhost:3000
    exit /b 0
)

:: Fallback: Open index directly in browser app mode
start msedge.exe --app="file:///%~dp0dist/index.html" || start chrome.exe --app="file:///%~dp0dist/index.html" || start "" "%~dp0dist\index.html"
