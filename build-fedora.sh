#!/usr/bin/env bash
set -e

echo "======================================================================"
echo " Industrial Auditing Management System - Fedora RPM & AppImage Builder"
echo " Target: Fedora Linux (x86_64) .rpm & .AppImage"
echo "======================================================================"
echo ""

# 1. Install Fedora System Dependencies
echo "[1/4] Checking and installing Fedora build dependencies via dnf..."
sudo dnf install -y \
  webkit2gtk4.1-devel \
  openssl-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel \
  gtk3-devel \
  rpm-build \
  rust \
  cargo \
  nodejs \
  npm \
  curl \
  wget

# 2. Check for Tauri CLI
if ! command -v cargo-tauri &> /dev/null; then
  echo "[2/4] Installing Tauri CLI via Cargo..."
  cargo install tauri-cli --version "^2.0.0" --locked
fi

# 3. Install frontend dependencies and compile static production build
echo "[3/4] Installing npm dependencies and compiling frontend..."
npm install
npm run build

# 4. Compile Fedora RPM & AppImage
echo "[4/4] Building Fedora RPM (.rpm) and Linux AppImage via Tauri..."
cargo tauri build --bundles rpm,appimage

echo ""
echo "======================================================================"
echo " BUILD SUCCESSFUL!"
echo " Generated Fedora RPM package:"
echo "   $(find src-tauri/target/release/bundle/rpm -name '*.rpm' 2>/dev/null || echo 'src-tauri/target/release/bundle/rpm/')"
echo " Generated universal AppImage:"
echo "   $(find src-tauri/target/release/bundle/appimage -name '*.AppImage' 2>/dev/null || echo 'src-tauri/target/release/bundle/appimage/')"
echo "======================================================================"
echo " To install on Fedora:"
echo "   sudo dnf install ./src-tauri/target/release/bundle/rpm/*.rpm"
echo "======================================================================"
