'use client';

import { useEffect, useState } from 'react';

const SW_BOOT_KEY = 'ecoscan_sw_controlled_once';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Registers SW + one-time reload so Chrome controls the page (required for install).
 */
export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showManualHint, setShowManualHint] = useState(false);
  const [swControlled, setSwControlled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (isStandalone()) return;

    let cancelled = false;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowManualHint(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    async function registerAndEnsureControl() {
      try {
        await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
        if (cancelled) return;
        await navigator.serviceWorker.ready;
        if (cancelled) return;

        if (navigator.serviceWorker.controller) {
          setSwControlled(true);
          return;
        }

        if (!sessionStorage.getItem(SW_BOOT_KEY)) {
          sessionStorage.setItem(SW_BOOT_KEY, '1');
          window.location.reload();
          return;
        }

        setSwControlled(!!navigator.serviceWorker.controller);
      } catch (e) {
        console.warn('[EcoScan] Service worker registration failed:', e);
      }
    }

    registerAndEnsureControl();

    return () => {
      cancelled = true;
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  useEffect(() => {
    if (isStandalone() || dismissed || deferredPrompt || !swControlled) return;
    const id = window.setTimeout(() => setShowManualHint(true), 5000);
    return () => clearTimeout(id);
  }, [deferredPrompt, dismissed, swControlled]);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (isStandalone() || dismissed) return null;

  if (deferredPrompt) {
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

  if (showManualHint) {
    return (
      <div
        className="fixed left-3 right-3 z-[60] rounded-2xl px-3 py-2.5 shadow-lg"
        style={{
          bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(6,10,6,0.92)',
          border: '1px solid rgba(16,185,129,0.2)',
          backdropFilter: 'blur(12px)',
        }}
        role="region"
      >
        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Install:</span>{' '}
          Chrome <span style={{ color: '#34D399' }}>(⋮)</span> →{' '}
          <span className="font-semibold" style={{ color: '#34D399' }}>Install app</span>. If it hangs, close all EcoScan tabs, clear Chrome cache for this site, open the link once, wait for a quick refresh, then try Install again.
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-[10px] font-semibold mt-1.5"
          style={{ color: 'var(--text-muted)' }}
        >
          Dismiss
        </button>
      </div>
    );
  }

  return null;
}
