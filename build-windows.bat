@echo off
setlocal EnableDelayedExpansion

echo ======================================================================
echo  Industrial Auditing Management System - Windows Installer Builder
echo  Target: Windows 10/11 x64 (.exe Installer ^& .msi)
echo ======================================================================
echo.

:: 1. Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js 18+ from https://nodejs.org/
    exit /b 1
)

:: 2. Check for Rust / Cargo
where cargo >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Rust toolchain not detected. Installing via winget or rustup...
    winget install --id Rustlang.Rustup -e --silent
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Please install Rust from https://rustup.rs/ and restart your terminal.
        exit /b 1
    )
)

:: 3. Check for Tauri CLI
where cargo-tauri >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing Tauri CLI...
    cargo install tauri-cli --version "^2.0.0" --locked
)

echo [1/3] Installing NPM dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed.
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Compiling React frontend and SQLite WASM assets...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build failed.
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Compiling Native Windows Executable (.exe / .msi)...
cargo tauri build --bundles nsis,msi
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Tauri build failed.
    exit /b %ERRORLEVEL%
)

echo.
echo ======================================================================
echo  BUILD SUCCESSFUL!
echo  Your Windows installers are located at:
echo    - Setup EXE: src-tauri\target\release\bundle\nsis\
echo    - MSI Package: src-tauri\target\release\bundle\msi\
echo ======================================================================
pause
