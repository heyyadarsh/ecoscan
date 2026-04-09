'use client';

import { useEffect, useState } from 'react';

/**
 * Registers the service worker and surfaces Chrome's install flow via beforeinstallprompt.
 * QR / in-app browsers often never fire beforeinstallprompt — user must open in Chrome.
 */
export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let cancelled = false;

    async function registerSw() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
        if (cancelled) return;
        await reg.update();
      } catch (e) {
        console.warn('[EcoScan] Service worker registration failed:', e);
      }
    }

    registerSw();

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    return () => {
      cancelled = true;
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (dismissed || !deferredPrompt) return null;

  return (
    <div
      className="fixed left-3 right-3 z-[60] flex items-center gap-2 rounded-2xl px-3 py-2.5 shadow-lg"
      style={{
        bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
        background: 'rgba(6,10,6,0.92)',
        border: '1px solid rgba(16,185,129,0.25)',
        backdropFilter: 'blur(12px)',
      }}
      role="region"
      aria-label="Install app"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
          Install EcoScan
        </p>
        <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Add to home screen — works like an app
        </p>
      </div>
      <button
        type="button"
        onClick={handleInstall}
        className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-black"
        style={{ background: 'linear-gradient(135deg,#059669,#10B981)', color: '#060A06' }}
      >
        Install
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-[10px] font-semibold px-1"
        style={{ color: 'var(--text-muted)' }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
