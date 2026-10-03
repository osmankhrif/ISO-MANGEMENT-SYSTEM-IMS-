export interface DesktopBuildInstructions {
  platform: 'windows' | 'fedora' | 'appimage';
  title: string;
  command: string;
  prerequisites: string[];
  outputArtifact: string;
  notes: string;
}

export class TauriBridge {
  static isTauri(): boolean {
    return typeof window !== 'undefined' && Boolean((window as any).__TAURI__);
  }

  static async showNotification(title: string, body: string): Promise<void> {
    if (this.isTauri()) {
      try {
        const tauri = (window as any).__TAURI__;
        if (tauri?.notification?.sendNotification) {
          tauri.notification.sendNotification({ title, body });
          return;
        }
      } catch (e) {
        console.warn('Tauri notification failed:', e);
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }

  static async saveFileLocally(filename: string, content: Uint8Array | string, mimeType: string = 'application/octet-stream'): Promise<void> {
    const blob = new Blob([content as any], { type: mimeType });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  static getDesktopBuildInstructions(): DesktopBuildInstructions[] {
    return [
      {
        platform: 'windows',
        title: 'Windows 10 / 11 (.exe & .msi Installer)',
        prerequisites: [
          'Node.js 18+ (LTS)',
          'Rust & Cargo (rustup install stable)',
          'Visual Studio C++ Build Tools 2022',
          'WebView2 Runtime (preinstalled on Win 10/11)',
        ],
        command: 'npm run build && npm run tauri:build -- --target x86_64-pc-windows-msvc',
        outputArtifact: 'src-tauri/target/release/bundle/nsis/Industrial_Auditing_Management_System_Setup.exe',
        notes: 'Generates NSIS installer .exe and enterprise .msi with silent deployment switches for domain policy rollout.',
      },
      {
        platform: 'fedora',
        title: 'Fedora Linux (.rpm Package)',
        prerequisites: [
          'sudo dnf install -y rust cargo nodejs webkit2gtk4.1-devel openssl-devel libappindicator-gtk3-devel',
          'Node.js 18+ & npm',
          'Tauri CLI: cargo install tauri-cli',
        ],
        command: 'npm run build && cargo tauri build --bundles rpm',
        outputArtifact: 'src-tauri/target/release/bundle/rpm/industrial-auditing-management-system-1.0.0-1.x86_64.rpm',
        notes: 'Natively packaged for Fedora 38/39/40/41 with RPM spec file, desktop launcher, and high-DPI Wayland/X11 support.',
      },
      {
        platform: 'appimage',
        title: 'Universal Linux (AppImage)',
        prerequisites: [
          'gcc, g++, make, pkg-config, libssl-dev, libsoup-3.0-dev, libwebkit2gtk-4.1-dev',
          'Tauri CLI: cargo install tauri-cli',
        ],
        command: 'npm run build && cargo tauri build --bundles appimage',
        outputArtifact: 'src-tauri/target/release/bundle/appimage/industrial-auditing-management-system_1.0.0_amd64.AppImage',
        notes: 'Single portable executable that runs on Fedora, RHEL, Ubuntu, Debian, Rocky Linux, and Arch without installation.',
      },
    ];
  }
}
