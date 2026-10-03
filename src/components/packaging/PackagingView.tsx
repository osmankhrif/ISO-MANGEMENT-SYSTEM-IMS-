import React, { useState } from 'react';
import { TauriBridge } from '../../utils/tauriBridge.ts';
import { PackageDownloadService } from '../../utils/packageDownloadService.ts';
import {
  Box,
  Terminal,
  Copy,
  Check,
  Download,
  ShieldCheck,
  FolderGit2,
  HardDrive,
  Laptop,
  Monitor,
  Flame,
  FileCode,
  Layers,
  ArrowRight,
  ExternalLink,
  Award,
  UserCheck,
  Globe,
  Settings,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export const PackagingView: React.FC = () => {
  const instructions = TauriBridge.getDesktopBuildInstructions();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Author & Publisher Customization State
  const [authorName, setAuthorName] = useState('Osman Khrif');
  const [authorCompany, setAuthorCompany] = useState('ISO Management System (IMS)');
  const [authorEmail, setAuthorEmail] = useState('osmansabor5555@yahoo.com');
  const [appName, setAppName] = useState('ISO Management System (IMS)');
  const [appIdentifier, setAppIdentifier] = useState('ISOManagementSystemIMS.ISOMANGEMENTSYSTEMIMS');
  const [publisherId, setPublisherId] = useState('CN=C69EF753-8EB4-40BB-8CE4-5F4E16C81631');
  const [appVersion, setAppVersion] = useState('1.0.0');

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const windowsQuickCommand = `npm install && npm run build && cargo tauri build --bundles nsis,msi`;
  const fedoraQuickCommand = `sudo dnf install -y webkit2gtk4.1-devel openssl-devel libappindicator-gtk3-devel librsvg2-devel rpm-build rust cargo nodejs && npm install && npm run build && cargo tauri build --bundles rpm,appimage`;
  const fedoraInstallCommand = `sudo dnf install ./src-tauri/target/release/bundle/rpm/*.rpm`;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Box className="w-5 h-5 text-amber-400" />
            Application Publishing & Distribution Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Publish this application under your own name to the Microsoft Store, Windows desktop installers (.exe & .msi), and Fedora Linux.
          </p>
        </div>

        {/* Header Action Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => PackageDownloadService.downloadPublishingGuide()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-xs font-mono transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Store Publishing Guide (.md)</span>
          </button>
          <button
            onClick={() => PackageDownloadService.downloadWindowsBuildScript()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Windows Script (.bat)</span>
          </button>
          <button
            onClick={() => PackageDownloadService.downloadGitHubActionsWorkflow()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-300 text-xs font-mono transition-colors"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>CI/CD Workflow (.yml)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. AUTHOR IDENTITY & MICROSOFT STORE REGISTRATION BLUEPRINT */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/40 rounded p-5 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Author Attribution & Microsoft Store Registration Blueprint
              </h2>
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono">
                Official Creator Setup
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Customize your developer profile, branding, and package identification so the published software is officially attributed to you.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://partner.microsoft.com/dashboard/registration"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-md"
            >
              <span>Microsoft Partner Center</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://www.pwabuilder.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors shadow-md"
            >
              <span>PWABuilder Tool</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Developer Attribution Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400">Author / Developer Name</label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3 py-1.5 rounded font-medium focus:border-indigo-500 focus:outline-none"
              placeholder="e.g. Osman Khrif"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400">Company / Organization</label>
            <input
              type="text"
              value={authorCompany}
              onChange={(e) => setAuthorCompany(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3 py-1.5 rounded font-medium focus:border-indigo-500 focus:outline-none"
              placeholder="e.g. ISO System (IMS)"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400">Contact / Support Email</label>
            <input
              type="email"
              value={authorEmail}
              onChange={(e) => setAuthorEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3 py-1.5 rounded font-medium focus:border-indigo-500 focus:outline-none"
              placeholder="e.g. osmansabor5555@yahoo.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400">Application Name</label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3 py-1.5 rounded font-medium focus:border-indigo-500 focus:outline-none"
              placeholder="e.g. ISO System (IMS)"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400">Package Identifier (Reverse Domain)</label>
            <input
              type="text"
              value={appIdentifier}
              onChange={(e) => setAppIdentifier(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3 py-1.5 rounded font-mono focus:border-indigo-500 focus:outline-none"
              placeholder="e.g. com.osmankhrif.isosystem"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400">Microsoft Publisher ID / CN</label>
            <input
              type="text"
              value={publisherId}
              onChange={(e) => setPublisherId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3 py-1.5 rounded font-mono focus:border-indigo-500 focus:outline-none"
              placeholder="e.g. CN=OSMAN-KHRIF"
            />
          </div>
        </div>

        {/* Generate & Download Customized Configs */}
        <div className="bg-slate-950/80 p-3.5 rounded border border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs space-y-0.5">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Export Custom Configs For This Developer Profile</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Download updated configuration files stamped with <strong className="text-indigo-300">{authorName}</strong> and <strong className="text-indigo-300">{appIdentifier}</strong>:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                PackageDownloadService.downloadCustomTauriConfig({
                  productName: appName,
                  identifier: appIdentifier,
                  version: appVersion,
                  authorName,
                  publisherId,
                })
              }
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-indigo-500/50 text-indigo-300 text-xs font-mono rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>tauri.conf.json</span>
            </button>
            <button
              onClick={() =>
                PackageDownloadService.downloadCustomCargoToml({
                  productName: appName,
                  version: appVersion,
                  authorName,
                  authorEmail,
                })
              }
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-indigo-500/50 text-indigo-300 text-xs font-mono rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Cargo.toml</span>
            </button>
            <button
              onClick={() => PackageDownloadService.downloadPublishingGuide()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-900/40 hover:bg-indigo-900/70 border border-indigo-600 text-white text-xs font-mono rounded transition-colors font-bold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Publishing Guide</span>
            </button>
          </div>
        </div>

        {/* 4-Step Visual Roadmap to Microsoft Store Publishing */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono text-indigo-300 font-bold uppercase tracking-wider block">
            4 Steps to Publish on Windows & Microsoft Store:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-white font-mono">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center text-xs">
                  1
                </span>
                <span>Partner Center</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Register as an Individual ($19 one-time) or Company ($99 one-time) at <strong className="text-slate-200">partner.microsoft.com</strong>.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-white font-mono">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center text-xs">
                  2
                </span>
                <span>Reserve App Name</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Under <em className="text-slate-300">Windows & Xbox &gt; Overview</em>, reserve your app name to generate your unique <strong className="text-amber-400 font-mono">CN Publisher ID</strong>.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-white font-mono">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center text-xs">
                  3
                </span>
                <span>Generate MSIX Package</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Paste the App URL into <strong className="text-sky-400">PWABuilder.com</strong> (or run <strong className="text-sky-300 font-mono">build-windows.bat</strong>) to download your signed Windows package.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-white font-mono">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-xs">
                  4
                </span>
                <span>Store Certification</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Upload your package, add screenshots, and submit. Microsoft reviews and approves within <strong className="text-emerald-400">24–72 hours</strong>.
              </p>
            </div>
          </div>

          {/* ================= EXACT PARTNER CENTER LOCATION BREAKDOWN ================= */}
          <div className="mt-4 bg-slate-950 p-4 rounded-lg border border-amber-500/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  📍 Where to Find Package ID & Publisher ID in Microsoft Partner Center
                </h3>
              </div>
              <a
                href="https://partner.microsoft.com/dashboard/home"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-mono font-medium underline"
              >
                <span>Open Partner Center Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Click-by-Click Navigation Path */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-300 font-semibold block">Exact Click-by-Click Navigation Path:</span>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono bg-slate-900 px-3 py-2 rounded border border-slate-800 text-slate-300">
                <span className="text-white font-bold">1. Partner Center Home</span>
                <ArrowRight className="w-3 h-3 text-amber-400" />
                <span className="text-white font-bold">2. Apps and games</span>
                <ArrowRight className="w-3 h-3 text-amber-400" />
                <span className="text-amber-300 font-bold">3. Click on "ISO System (IMS)"</span>
                <ArrowRight className="w-3 h-3 text-amber-400" />
                <span className="text-white font-bold">4. Product management</span>
                <ArrowRight className="w-3 h-3 text-amber-400" />
                <span className="text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/50">5. Package identity</span>
              </div>
            </div>

            {/* Field Mapping Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border border-slate-800 rounded overflow-hidden">
                <thead className="bg-slate-900 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Field on Partner Center Screen</th>
                    <th className="py-2 px-3">Field in PWABuilder (Paste Here)</th>
                    <th className="py-2 px-3">Example Format</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono text-slate-300">
                  <tr className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 text-white font-semibold">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">Name</span>
                    </td>
                    <td className="py-2.5 px-3 text-sky-400 font-bold">Package ID</td>
                    <td className="py-2.5 px-3 text-slate-400 select-all">12345OsmanKhrif.ISOSystemIMS</td>
                  </tr>
                  <tr className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 text-white font-semibold">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">Publisher</span>
                    </td>
                    <td className="py-2.5 px-3 text-sky-400 font-bold">Publisher ID</td>
                    <td className="py-2.5 px-3 text-amber-400 select-all">CN=A1B2C3D4-E5F6-7890-ABCD-EF1234567890</td>
                  </tr>
                  <tr className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 text-white font-semibold">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">Publisher display name</span>
                    </td>
                    <td className="py-2.5 px-3 text-sky-400 font-bold">Publisher display name</td>
                    <td className="py-2.5 px-3 text-emerald-400 select-all">Osman Khrif</td>
                  </tr>
                  <tr className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 text-white font-semibold">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">Version</span>
                    </td>
                    <td className="py-2.5 px-3 text-sky-400 font-bold">App Version</td>
                    <td className="py-2.5 px-3 text-slate-400 select-all">1.0.0.0</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-amber-950/20 border border-amber-500/30 rounded p-2.5 text-[11px] text-amber-300 leading-relaxed">
              ⚠️ <strong>Important Note:</strong> If you haven't reserved your app name yet, the <em>"Package identity"</em> page won't exist yet. First click <strong>"Create a new product" &gt; "MSIX or PWA app"</strong>, type <strong>"ISO System (IMS)"</strong> and click <strong>Reserve product name</strong>. Microsoft will instantly generate your unique IDs!
            </div>
          </div>
        </div>
      </div>

      {/* WEB PUBLISHING & APP URLS SECTION */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 rounded p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Live Cloud App URLs (Required for Publishing & Sharing)
              </h2>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono">
                Cloud Run Hosted
              </span>
            </div>
            <p className="text-xs text-slate-300">
              When publishing the app, registering OAuth consent, or sharing with team members, use the designated URLs below:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shared / Production URL */}
          <div className="bg-slate-950 p-3.5 rounded border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Shared / Production App URL (Recommended)
              </span>
              <button
                onClick={() => handleCopy('https://ais-pre-nfe4jixqfqfjqgj5pmmyap-797249565287.europe-west2.run.app', 'shared_url')}
                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-mono font-bold"
              >
                {copiedKey === 'shared_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'shared_url' ? 'Copied!' : 'Copy App URL'}</span>
              </button>
            </div>
            <input
              type="text"
              readOnly
              value="https://ais-pre-nfe4jixqfqfjqgj5pmmyap-797249565287.europe-west2.run.app"
              className="w-full bg-slate-900 border border-slate-800 text-emerald-300 text-xs font-mono px-3 py-1.5 rounded select-all focus:outline-none"
            />
            <p className="text-[11px] text-slate-400">
              👉 Paste this into the <strong className="text-white">"App URL"</strong> or <strong className="text-white">"Application home page"</strong> field when completing the publish form.
            </p>
          </div>

          {/* Development Preview URL */}
          <div className="bg-slate-950 p-3.5 rounded border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                Development Preview URL
              </span>
              <button
                onClick={() => handleCopy('https://ais-dev-nfe4jixqfqfjqgj5pmmyap-797249565287.europe-west2.run.app', 'dev_url')}
                className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-mono font-bold"
              >
                {copiedKey === 'dev_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'dev_url' ? 'Copied!' : 'Copy Dev URL'}</span>
              </button>
            </div>
            <input
              type="text"
              readOnly
              value="https://ais-dev-nfe4jixqfqfjqgj5pmmyap-797249565287.europe-west2.run.app"
              className="w-full bg-slate-900 border border-slate-800 text-sky-300 text-xs font-mono px-3 py-1.5 rounded select-all focus:outline-none"
            />
            <p className="text-[11px] text-slate-400">
              Used for live interactive debugging and staging previews in your developer session.
            </p>
          </div>
        </div>

        {/* Quick Reference Helper for Common Publishing Fields */}
        <div className="bg-slate-950/60 p-3 rounded border border-slate-800 text-xs space-y-1.5 font-mono">
          <span className="text-amber-400 font-bold block text-[11px] uppercase tracking-wide">
            Cheat Sheet for Common Publishing & Consent Fields:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400">App URL / Home Page:</span>{' '}
              <span className="text-white select-all">https://ais-pre-nfe4jixqfqfjqgj5pmmyap-797249565287.europe-west2.run.app</span>
            </div>
            <div>
              <span className="text-slate-400">Authorized Domain:</span>{' '}
              <span className="text-white select-all">europe-west2.run.app</span>
            </div>
            <div>
              <span className="text-slate-400">Privacy Policy Link:</span>{' '}
              <span className="text-emerald-400 select-all font-bold">https://ais-pre-nfe4jixqfqfjqgj5pmmyap-797249565287.europe-west2.run.app/privacy.html</span>
            </div>
            <div>
              <span className="text-slate-400">Terms of Service Link:</span>{' '}
              <span className="text-white select-all">https://ais-pre-nfe4jixqfqfjqgj5pmmyap-797249565287.europe-west2.run.app</span>
            </div>
          </div>
        </div>
      </div>

      {/* Target Distribution Modules: Windows vs Fedora */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* WINDOWS TARGET CARD */}
        <div className="bg-slate-900 border border-sky-500/30 rounded p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white font-mono">Windows 10 / 11 Native Installer</h2>
                <span className="text-[10px] text-sky-400 font-mono">Target: .exe (NSIS) & .msi Installer</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300 text-[10px] font-mono">
              x64 / ARM64
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Generates a certified standalone Windows installer executable with zero browser chrome, embedded local SQLite engine, and desktop shortcut generation.
            </p>

            <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Output Artifact:</span>
                <span className="text-emerald-400 font-bold">Industrial-Auditing-Management-System_1.0.0_x64-setup.exe</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Installer Type:</span>
                <span className="text-slate-200">NSIS Executable + Windows Installer (.msi)</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Architecture:</span>
                <span className="text-slate-200">Native Tauri Rust Binary + Edge WebView2</span>
              </div>
            </div>

            {/* Quick Build Snippet */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>Command to compile .exe on Windows:</span>
                <button
                  onClick={() => handleCopy(windowsQuickCommand, 'win_cmd')}
                  className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold"
                >
                  {copiedKey === 'win_cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'win_cmd' ? 'Copied' : 'Copy Command'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-[11px] text-sky-300 overflow-x-auto select-all">
                {windowsQuickCommand}
              </pre>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => PackageDownloadService.downloadWindowsBuildScript()}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs font-mono transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download build-windows.bat
              </button>
              <button
                onClick={() => PackageDownloadService.downloadWindowsOfflineLauncher()}
                className="text-slate-400 hover:text-white text-xs underline font-mono"
              >
                Download Portable Offline .bat
              </button>
            </div>
          </div>
        </div>

        {/* FEDORA TARGET CARD */}
        <div className="bg-slate-900 border border-blue-500/30 rounded p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white font-mono">Fedora Linux Application (.rpm)</h2>
                <span className="text-[10px] text-blue-400 font-mono">Target: Fedora 38/39/40/41 RPM & AppImage</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-300 text-[10px] font-mono">
              x86_64 / RPM
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Compiles a native Fedora package with system dependencies registered (`webkit2gtk4.1`, `openssl`), integrating with GNOME/KDE desktop menus and system package managers.
            </p>

            <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Output RPM Package:</span>
                <span className="text-emerald-400 font-bold">industrial-auditing-management-system-1.0.0-1.x86_64.rpm</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Universal Binary:</span>
                <span className="text-slate-200">Industrial-Auditing-Management-System_1.0.0_amd64.AppImage</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Install Command:</span>
                <span className="text-slate-300 font-mono text-[10px]">sudo dnf install ./...rpm</span>
              </div>
            </div>

            {/* Quick Build Snippet */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>One-line build on Fedora:</span>
                <button
                  onClick={() => handleCopy(fedoraQuickCommand, 'fed_cmd')}
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold"
                >
                  {copiedKey === 'fed_cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'fed_cmd' ? 'Copied' : 'Copy Command'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-[11px] text-blue-300 overflow-x-auto select-all">
                {fedoraQuickCommand}
              </pre>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => PackageDownloadService.downloadFedoraBuildScript()}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs font-mono transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download build-fedora.sh
              </button>
              <button
                onClick={() => PackageDownloadService.downloadFedoraOfflineLauncher()}
                className="text-slate-400 hover:text-white text-xs underline font-mono"
              >
                Download Portable Offline .sh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CLOUD BUILDER / GITHUB ACTIONS CONTINUOUS DELIVERY */}
      <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-emerald-400" />
              Automated Cloud Compilation via GitHub Actions CI/CD
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Compile both the Windows <strong className="text-white">.exe</strong> and Fedora <strong className="text-white">.rpm</strong> automatically on cloud runners without setting up local Rust compilers.
            </p>
          </div>
          <button
            onClick={() => PackageDownloadService.downloadGitHubActionsWorkflow()}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download build-desktop.yml</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
            <span className="font-bold text-white font-mono flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              1. Push to Repository
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Workflow file is pre-configured at <code className="text-amber-300">.github/workflows/build-desktop.yml</code>. Pushing to GitHub immediately starts parallel builds.
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
            <span className="font-bold text-white font-mono flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              2. Parallel Native Runners
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              GitHub spins up a <code className="text-white">windows-latest</code> VM for the NSIS EXE installer and a Linux runner for the Fedora RPM and AppImage.
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
            <span className="font-bold text-white font-mono flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              3. Download Built Packages
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Find your compiled <strong className="text-emerald-400">Windows .exe</strong> and <strong className="text-blue-400">Fedora .rpm</strong> directly under GitHub Actions Run Artifacts.
            </p>
          </div>
        </div>
      </div>

      {/* Step-by-Step Instructions & Fedora DNF Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-4 text-xs">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          Native Deployment & Installation Guide
        </h2>

        <div className="space-y-4 text-slate-300">
          <div>
            <span className="font-bold text-white font-mono block text-xs">
              A. Installing the Generated RPM on Fedora Linux:
            </span>
            <div className="bg-slate-950 p-3 rounded border border-slate-800 mt-1 font-mono text-[11px] space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>Command:</span>
                <button
                  onClick={() => handleCopy(fedoraInstallCommand, 'fed_install')}
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  {copiedKey === 'fed_install' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'fed_install' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="text-amber-300">{fedoraInstallCommand}</pre>
              <p className="text-slate-400 text-[10px]">
                DNF verifies signatures, resolves WebKitGTK dependencies, and registers the application launcher in GNOME / KDE Application Menu.
              </p>
            </div>
          </div>

          <div>
            <span className="font-bold text-white font-mono block text-xs">
              B. Running the Windows .exe Installer:
            </span>
            <div className="bg-slate-950 p-3 rounded border border-slate-800 mt-1 text-[11px] space-y-1 text-slate-300">
              <p>
                Double click <code className="text-emerald-400 font-mono">Industrial-Auditing-Management-System_1.0.0_x64-setup.exe</code>.
              </p>
              <ul className="list-disc list-inside text-slate-400 text-[10px] space-y-0.5">
                <li>Installs to <code className="text-slate-300">%LOCALAPPDATA%\Programs\industrial-auditing-management-system</code></li>
                <li>Creates Start Menu and Desktop shortcuts</li>
                <li>Operates 100% offline with zero telemetry or cloud requirements</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
