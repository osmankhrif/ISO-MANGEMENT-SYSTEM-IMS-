export class PackageDownloadService {
  static downloadFile(filename: string, content: string, mimeType: string = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static downloadWindowsBuildScript() {
    const script = `@echo off
setlocal EnableDelayedExpansion

echo ======================================================================
echo  Industrial Auditing Management System - Windows Installer Builder
echo  Target: Windows 10/11 x64 (.exe Installer ^& .msi)
echo ======================================================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/
    exit /b 1
)

where cargo >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Rust toolchain not detected. Installing via winget...
    winget install --id Rustlang.Rustup -e --silent
)

where cargo-tauri >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing Tauri CLI...
    cargo install tauri-cli --version "^2.0.0" --locked
)

echo [1/3] Installing NPM dependencies...
call npm install

echo.
echo [2/3] Compiling React frontend and SQLite WASM assets...
call npm run build

echo.
echo [3/3] Compiling Native Windows Executable (.exe / .msi)...
cargo tauri build --bundles nsis,msi

echo.
echo ======================================================================
echo  BUILD SUCCESSFUL!
echo  Your Windows installer (.exe) is located in:
echo    src-tauri\\target\\release\\bundle\\nsis\\
echo ======================================================================
pause
`;
    this.downloadFile('build-windows.bat', script, 'application/x-bat');
  }

  static downloadFedoraBuildScript() {
    const script = `#!/usr/bin/env bash
set -e

echo "======================================================================"
echo " Industrial Auditing Management System - Fedora RPM & AppImage Builder"
echo " Target: Fedora Linux (x86_64) .rpm & .AppImage"
echo "======================================================================"
echo ""

echo "[1/4] Installing Fedora dependencies via dnf..."
sudo dnf install -y \\
  webkit2gtk4.1-devel \\
  openssl-devel \\
  libappindicator-gtk3-devel \\
  librsvg2-devel \\
  gtk3-devel \\
  rpm-build \\
  rust \\
  cargo \\
  nodejs \\
  npm

if ! command -v cargo-tauri &> /dev/null; then
  echo "[2/4] Installing Tauri CLI..."
  cargo install tauri-cli --version "^2.0.0" --locked
fi

echo "[3/4] Compiling frontend production bundle..."
npm install
npm run build

echo "[4/4] Building Fedora RPM (.rpm) and Linux AppImage via Tauri..."
cargo tauri build --bundles rpm,appimage

echo ""
echo "======================================================================"
echo " BUILD SUCCESSFUL!"
echo " Install with: sudo dnf install ./src-tauri/target/release/bundle/rpm/*.rpm"
echo "======================================================================"
`;
    this.downloadFile('build-fedora.sh', script, 'application/x-sh');
  }

  static downloadGitHubActionsWorkflow() {
    const yaml = `name: Build Cross-Platform Desktop Installers (Windows .exe & Fedora .rpm)

on:
  push:
    branches: [main, master]
  workflow_dispatch:

jobs:
  build-windows:
    name: Build Windows Installer (.exe & .msi)
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: dtolnay/rust-toolchain@stable
      - run: npm ci
      - run: npm run build
      - run: cargo install tauri-cli --version "^2.0.0" --locked
      - run: cargo tauri build --bundles nsis,msi
      - uses: actions/upload-artifact@v4
        with:
          name: Windows-Installer-EXE
          path: src-tauri/target/release/bundle/nsis/*.exe

  build-fedora:
    name: Build Fedora RPM (.rpm) & Linux AppImage
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: dtolnay/rust-toolchain@stable
      - run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential libssl-dev rpm
      - run: npm ci
      - run: npm run build
      - run: cargo install tauri-cli --version "^2.0.0" --locked
      - run: cargo tauri build --bundles rpm,appimage
      - uses: actions/upload-artifact@v4
        with:
          name: Fedora-RPM-Package
          path: src-tauri/target/release/bundle/rpm/*.rpm
`;
    this.downloadFile('build-desktop.yml', yaml, 'application/x-yaml');
  }

  static downloadWindowsOfflineLauncher() {
    const bat = `@echo off
setlocal
title Industrial Auditing Management System (Offline)
cd /d "%~dp0"
where npx >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start "" /b npx --yes serve -s dist -l 3000
    timeout /t 2 >nul
    start msedge.exe --app="http://localhost:3000" || start chrome.exe --app="http://localhost:3000" || start http://localhost:3000
    exit /b 0
)
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    start "" /b python -m http.server 3000 --directory dist
    timeout /t 2 >nul
    start msedge.exe --app="http://localhost:3000" || start chrome.exe --app="http://localhost:3000" || start http://localhost:3000
    exit /b 0
)
start msedge.exe --app="file:///%~dp0dist/index.html" || start "%~dp0dist\\index.html"
`;
    this.downloadFile('Launch-Windows-Offline.bat', bat, 'application/x-bat');
  }

  static downloadFedoraOfflineLauncher() {
    const sh = `#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"
PORT=3000

launch_browser() {
  local url="$1"
  if command -v google-chrome &> /dev/null; then
    google-chrome --app="$url" &
  elif command -v microsoft-edge &> /dev/null; then
    microsoft-edge --app="$url" &
  elif command -v xdg-open &> /dev/null; then
    xdg-open "$url" &
  fi
}

if command -v python3 &> /dev/null; then
  python3 -m http.server $PORT --directory dist &
  PID=$!
  sleep 1
  launch_browser "http://localhost:$PORT"
  wait $PID
elif command -v npx &> /dev/null; then
  npx --yes serve -s dist -l $PORT &
  PID=$!
  sleep 1
  launch_browser "http://localhost:$PORT"
  wait $PID
else
  xdg-open "dist/index.html" &
fi
`;
    this.downloadFile('Launch-Fedora-Offline.sh', sh, 'application/x-sh');
  }

  static downloadPublishingGuide() {
    const guide = `# Microsoft Windows & Store Publishing Guide
## Industrial Auditing Management System

1. Register at Microsoft Partner Center: https://partner.microsoft.com/dashboard/registration
2. Reserve your app name under Windows & Xbox > Overview > Create new app.
3. Package your app:
   - Option A: PWABuilder (https://www.pwabuilder.com) with URL: https://ais-pre-nfe4jixqfqfjqgj5pmmyap-797249565287.europe-west2.run.app
   - Option B: Run build-windows.bat locally or trigger .github/workflows/build-desktop.yml
4. Upload your package (.msix, .msi, or .exe) to Partner Center and submit for certification.
`;
    this.downloadFile('MICROSOFT_WINDOWS_PUBLISHING_GUIDE.md', guide, 'text/markdown');
  }

  static downloadCustomTauriConfig(params: {
    productName: string;
    identifier: string;
    version: string;
    authorName: string;
    publisherId?: string;
  }) {
    const config = {
      $schema: 'https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-config-schema/schema.json',
      productName: params.productName || 'Industrial Auditing Management System',
      version: params.version || '1.0.0',
      identifier: params.identifier || 'com.auditing.management',
      build: {
        beforeDevCommand: 'npm run dev',
        beforeBuildCommand: 'npm run build',
        devUrl: 'http://localhost:3000',
        frontendDist: '../dist',
      },
      app: {
        windows: [
          {
            title: `${params.productName} - By ${params.authorName || 'Developer'}`,
            width: 1440,
            height: 900,
            minWidth: 1024,
            minHeight: 700,
            resizable: true,
            fullscreen: false,
            center: true,
          },
        ],
        security: {
          csp: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:;",
        },
      },
      bundle: {
        active: true,
        targets: ['nsis', 'msi', 'rpm', 'deb', 'appimage'],
        icon: [
          'icons/32x32.png',
          'icons/128x128.png',
          'icons/128x128@2x.png',
          'icons/icon.icns',
          'icons/icon.ico',
        ],
        category: 'Office',
        shortDescription: 'Industrial Auditing Management System',
        longDescription: `Professional offline-first ISO 9001 / 14001 / 45001 Auditing Management System created by ${params.authorName || 'Developer'}.`,
        windows: {
          certificateThumbprint: null,
          digestAlgorithm: 'sha256',
          timestampUrl: '',
        },
      },
    };
    this.downloadFile('tauri.conf.json', JSON.stringify(config, null, 2), 'application/json');
  }

  static downloadCustomCargoToml(params: {
    productName: string;
    version: string;
    authorName: string;
    authorEmail: string;
  }) {
    const toml = `[package]
name = "${(params.productName || 'industrial-auditing-system').toLowerCase().replace(/[^a-z0-9]/g, '-')}"
version = "${params.version || '1.0.0'}"
description = "Cross-Platform Industrial Auditing Management System"
authors = ["${params.authorName || 'Author'} <${params.authorEmail || 'author@example.com'}>"]
license = "Proprietary"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2.0.0", features = [] }

[dependencies]
tauri = { version = "2.0.0", features = ["tray-icon"] }
tauri-plugin-fs = "2.0.0"
tauri-plugin-dialog = "2.0.0"
tauri-plugin-notification = "2.0.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
rusqlite = { version = "0.31.0", features = ["bundled"] }

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
`;
    this.downloadFile('Cargo.toml', toml, 'text/plain');
  }
}
