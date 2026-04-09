'use client';

import { useEffect, useState } from 'react';

const SCENE_URL = 'https://prod.spline.design/UCjm2Rr-j7SbCjHV/scene.splinecode';
const CANVAS_ID = 'spline-bg-canvas';

export default function SplineBackground() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Inject an inline <script type="module"> that loads at RUNTIME —
    // webpack/Turbopack never touch it, so the WASM loading inside
    // @splinetool/runtime works correctly (import.meta.url resolves to the
    // esm.sh CDN URL, so process.wasm is fetched from there directly).
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
      (async () => {
        try {
          const { Application } = await import('https://esm.sh/@splinetool/runtime');
          const canvas = document.getElementById('${CANVAS_ID}');
          if (!canvas) return;
          canvas.width  = window.innerWidth;
          canvas.height = window.innerHeight;
          const app = new Application(canvas);
          await app.load('${SCENE_URL}');
          window.__splineApp = app;
          window.dispatchEvent(new CustomEvent('spline-ready'));
        } catch (err) {
          console.warn('[EcoScan] Spline scene failed to load:', err);
          window.dispatchEvent(new CustomEvent('spline-error'));
        }
      })();
    `;
    document.head.appendChild(script);

    const onReady = () => setLoaded(true);
    window.addEventListener('spline-ready', onReady);

    return () => {
      window.removeEventListener('spline-ready', onReady);
      try { document.head.removeChild(script); } catch { /* already removed */ }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Dark fallback — fades away once scene is ready */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg,#060A06 0%,#0a1f0a 100%)',
          opacity: loaded ? 0 : 1,
          transition: 'opacity 0.9s ease',
          zIndex: 1,
        }}
      />

      {/* Spinner while scene streams in */}
      {!loaded && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 2 }}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-11 h-11 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#10B981', borderTopColor: 'transparent' }}
            />
            <p className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'rgba(52,211,153,0.5)' }}>
              Loading scene…
            </p>
          </div>
        </div>
      )}

      {/* WebGL canvas — Spline renders into this */}
      <canvas
        id={CANVAS_ID}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.9s ease',
          zIndex: 0,
        }}
      />

      {/* Vignette — keeps UI text readable without hiding the 3D scene */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg,rgba(6,10,6,0.28) 0%,rgba(6,10,6,0.06) 40%,rgba(6,10,6,0.52) 100%)',
          zIndex: 3,
        }}
      />
    </div>
  );
}
