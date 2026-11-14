import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  X,
  Copy,
  Check,
  Download,
  Activity,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  Globe,
  ExternalLink,
  Usb,
  Terminal,
  ArrowUpRight,
} from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxPhoneSampleRate: number;
}

const SHARED_APP_URL = 'https://ais-pre-thlwtpk4vy2ife4zxcf3ip-89130432837.us-east5.run.app';
const DEV_APP_URL = 'https://ais-dev-thlwtpk4vy2ife4zxcf3ip-89130432837.us-east5.run.app';

export const InstallModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  maxPhoneSampleRate,
}) => {
  const [selectedUrlType, setSelectedUrlType] = useState<'shared' | 'dev'>('shared');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedAdb, setCopiedAdb] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'install' | 'pixel-usb' | 'troubleshoot'>('pixel-usb');

  const activeUrl = selectedUrlType === 'shared' ? SHARED_APP_URL : DEV_APP_URL;

  // Listen for beforeinstallprompt event (native PWA install prompt in Chrome Android/Desktop)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Generate QR code whenever modal opens or URL changes
  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(activeUrl, {
        width: 340,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code', err));
    }
  }, [isOpen, activeUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Install on Android Phone
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-cyan-400 text-slate-950 px-2 py-0.5 rounded-full">
                  PWA Web App
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Fullscreen standalone app with phone accelerometer sensing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 pt-2 flex items-center gap-3 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pixel-usb')}
            className={`pb-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'pixel-usb'
                ? 'border-cyan-600 text-cyan-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-600" />
            <span className="font-extrabold text-cyan-900">Pixel 4a USB / PC Dev</span>
            <span className="text-[9px] bg-cyan-100 text-cyan-800 font-bold px-1.5 py-0.2 rounded">Fastest</span>
          </button>
          <button
            onClick={() => setActiveTab('install')}
            className={`pb-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'install'
                ? 'border-cyan-600 text-cyan-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>QR Code &amp; Wireless</span>
          </button>
          <button
            onClick={() => setActiveTab('troubleshoot')}
            className={`pb-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'troubleshoot'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Fix Errors</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Quick Install Prompt if supported in this browser */}
          {deferredPrompt && !isInstalled && (
            <div className="bg-cyan-50 border border-cyan-300 rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-cyan-700 shrink-0" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-cyan-950">Install VibraBalance to Home Screen</h4>
                  <p className="text-[11px] text-cyan-800">1-tap native installation available on this device</p>
                </div>
              </div>
              <button
                onClick={handleNativeInstall}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                Install Now
              </button>
            </div>
          )}

          {activeTab === 'pixel-usb' && (
            <div className="space-y-4">
              {/* USB Connected Banner */}
              <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-900 text-white rounded-xl p-4 border border-cyan-500/30 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                    <Usb className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Pixel 4a Connected via USB (Developer Mode)
                      <span className="text-[10px] bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                        Ready
                      </span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Since your phone is connected to your PC with USB debugging enabled, you can push and inspect the app on your phone directly from your computer!
                    </p>
                  </div>
                </div>
              </div>

              {/* Option 1: Chrome DevTools chrome://inspect */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-cyan-600" />
                    Method 1 (Fastest, No Terminal): PC Chrome DevTools
                  </span>
                  <span className="text-[10px] font-bold text-cyan-800 bg-cyan-100 px-2 py-0.5 rounded">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Google Chrome on your PC can directly open and control web apps on your connected Pixel 4a:
                </p>
                <ol className="text-xs text-slate-700 space-y-1.5 list-decimal list-inside pl-1">
                  <li>On your PC, open Chrome and type <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[11px] text-cyan-900">chrome://inspect/#devices</code> in the address bar.</li>
                  <li>Under <strong>Remote Target</strong>, you will see your <strong>Google Pixel 4a</strong>. (If your phone asks &quot;Allow USB debugging?&quot;, tap <strong>Allow</strong>).</li>
                  <li>In the <strong>&quot;Open tab with url&quot;</strong> box, paste:
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={SHARED_APP_URL}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[11px] font-mono select-all"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-900 text-white font-bold rounded shrink-0 cursor-pointer"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </li>
                  <li>Click <strong>&quot;Open&quot;</strong>. The app instantly appears on your Pixel 4a screen!</li>
                  <li>Click <strong>&quot;inspect&quot;</strong> on PC to view live vibration data streaming from your Pixel&apos;s accelerometer.</li>
                  <li>On your Pixel 4a, tap Chrome&apos;s three dots <strong>(⋮) &gt; &quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong> to keep the permanent standalone icon.</li>
                </ol>
              </div>

              {/* Option 2: ADB Command Line */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-slate-700" />
                    Method 2: One-Line ADB Command (From PC Command Prompt / PowerShell)
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  If you have the Android SDK or ADB Platform Tools installed on your PC, run this command in your PC terminal to launch the app on your phone immediately:
                </p>
                <div className="bg-slate-900 text-cyan-300 font-mono text-xs p-3 rounded-lg flex items-center justify-between gap-2 overflow-x-auto">
                  <code className="text-[11px]">
                    adb shell am start -a android.intent.action.VIEW -d &quot;{SHARED_APP_URL}&quot;
                  </code>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(`adb shell am start -a android.intent.action.VIEW -d "${SHARED_APP_URL}"`);
                      setCopiedAdb(true);
                      setTimeout(() => setCopiedAdb(false), 2500);
                    }}
                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-[10px] shrink-0 cursor-pointer"
                  >
                    {copiedAdb ? 'Copied!' : 'Copy Command'}
                  </button>
                </div>
              </div>

              {/* Option 3: Generate APK via PWABuilder */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-purple-600" />
                    Method 3: Generate a Standalone .APK File for <code className="text-purple-900 font-mono">adb install</code>
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  If you want an actual physical <code>.apk</code> package file on your PC to sideload onto your Pixel:
                </p>
                <ol className="text-xs text-slate-700 space-y-1 list-decimal list-inside pl-1">
                  <li>Go to <strong>PWABuilder.com</strong> (Google &amp; Microsoft&apos;s official PWA packaging tool).</li>
                  <li>Paste: <code className="bg-white px-1 py-0.5 rounded border border-slate-300 font-mono text-[10px]">{SHARED_APP_URL}</code></li>
                  <li>Click <strong>Package for Stores &gt; Android &gt; Download APK</strong>.</li>
                  <li>Install onto your Pixel 4a with: <code className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded font-mono text-[10px]">adb install -r app-debug.apk</code>.</li>
                </ol>
                <div className="pt-1">
                  <a
                    href={`https://www.pwabuilder.com?url=${encodeURIComponent(SHARED_APP_URL)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-cyan-700 hover:text-cyan-800 hover:underline"
                  >
                    <span>Open PWABuilder with this URL</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'install' && (
            <>
              {/* URL Switcher Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Select Target Link for Phone:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUrlType('shared')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      selectedUrlType === 'shared'
                        ? 'bg-cyan-50 border-cyan-400 ring-2 ring-cyan-500/20 shadow-xs'
                        : 'bg-white border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-cyan-600" />
                        Shared Preview URL
                      </span>
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Works on any phone without requiring Google developer login.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedUrlType('dev')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      selectedUrlType === 'dev'
                        ? 'bg-cyan-50 border-cyan-400 ring-2 ring-cyan-500/20 shadow-xs'
                        : 'bg-white border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                        Development App URL
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Requires phone Chrome to be signed into your Google developer account.
                    </p>
                  </button>
                </div>
              </div>

              {/* QR Code & Direct Link Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 items-center">
                {/* Left: QR Code */}
                <div className="sm:col-span-5 flex flex-col items-center text-center">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-300 shadow-md">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Scan QR code to open VibraBalance on Android"
                        className="w-40 h-40 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-40 h-40 flex items-center justify-center text-xs text-slate-400">
                        Generating QR code...
                      </div>
                    )}
                  </div>
                  <span className="mt-2 text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                    Scan with Phone Camera
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Open Camera app, Google Lens, or Chrome
                  </span>
                </div>

                {/* Right: Direct Link & Copy */}
                <div className="sm:col-span-7 space-y-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Mobile Link:
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={activeUrl}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-800 select-all focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-2xs"
                      />
                      <button
                        onClick={handleCopyLink}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                          copied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Sensor Ready Badge */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-cyan-600" />
                        Built-in Accelerometer:
                      </span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                        HTTPS Ready (~{maxPhoneSampleRate} Hz)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Android Chrome natively permits motion sensors over this secure connection.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Step Install Process */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  How to Install on Android in 3 Steps:
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                    <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 font-bold text-xs flex items-center justify-center border border-cyan-300">
                      1
                    </div>
                    <h5 className="text-xs font-bold text-slate-900">Open in Chrome</h5>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Scan the QR code with your camera or open the link above in Chrome on your phone.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                    <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 font-bold text-xs flex items-center justify-center border border-cyan-300">
                      2
                    </div>
                    <h5 className="text-xs font-bold text-slate-900">Tap Menu (⋮) &gt; Install</h5>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Tap the <strong>three dots (⋮)</strong> at top-right and select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                    <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 font-bold text-xs flex items-center justify-center border border-cyan-300">
                      3
                    </div>
                    <h5 className="text-xs font-bold text-slate-900">Confirm &amp; Launch</h5>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Tap <strong>Install</strong>. The icon will appear on your home screen and open full-screen like a native app!
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'troubleshoot' && (
            /* Troubleshooting Tab */
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950 space-y-1">
                  <h4 className="font-bold text-sm">Resolving Download &amp; Install Errors:</h4>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Here are the exact causes and immediate solutions for common errors encountered when installing or opening the app on Android:
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {/* Error 1 */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    1. Error: &quot;App could not be installed&quot; or &quot;Installation failed&quot; in Chrome
                  </span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    <strong>Cause:</strong> Android&apos;s WebAPK minting service requires PNG icon assets (192px and 512px) and a registered service worker.
                  </p>
                  <p className="text-slate-700 text-[11px] leading-relaxed font-medium bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-emerald-900">
                    <strong>Resolution (Fixed now):</strong> We have generated the required PNG icons (<code>pwa-192x192.png</code> and <code>pwa-512x512.png</code>) and registered the offline service worker. Refresh the page on your phone, then tap <strong>&quot;Install app&quot;</strong> again.
                  </p>
                </div>

                {/* Error 2 */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    2. Error: &quot;403 Forbidden&quot; / &quot;Access Denied&quot; / Google Sign-In Loop
                  </span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    <strong>Cause:</strong> The <code>ais-dev-...</code> URL requires an active Google AI Studio developer session cookie. If your phone&apos;s Chrome is not signed into that Google account, Cloud Run blocks access.
                  </p>
                  <p className="text-slate-700 text-[11px] leading-relaxed font-medium bg-cyan-50 border border-cyan-200 p-2 rounded-lg text-cyan-900">
                    <strong>Resolution:</strong> Use the <strong>Shared Preview URL</strong> instead:
                    <br />
                    <span className="font-mono text-[10px] break-all select-all font-bold text-cyan-950">
                      https://ais-pre-thlwtpk4vy2ife4zxcf3ip-89130432837.us-east5.run.app
                    </span>
                    <br />
                    This link opens freely on any phone without requiring Google login.
                  </p>
                </div>

                {/* Error 3 */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    3. Looking for an &quot;.apk&quot; file download or Google Play Store listing?
                  </span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    This is a <strong>Progressive Web App (PWA)</strong>, which is the modern standard for Android. PWAs don&apos;t require bulky APK files or Play Store approvals—they install directly from the browser onto your home screen and run with full hardware accelerometer access.
                  </p>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    <strong>Quick Fallback:</strong> If &quot;Install app&quot; does not appear, tap Chrome&apos;s menu <strong>(⋮) &gt; &quot;Add to Home screen&quot;</strong>. This creates the app icon directly without going through the Play WebAPK builder.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-300 px-5 sm:px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>PWA Manifest &amp; Service Worker Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
