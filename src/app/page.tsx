'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Zap, Leaf, LogOut, X } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { recordScan, updateUserName, updateUserCity } from '@/lib/points';
import { checkScanAllowed, getDailyScansRemaining } from '@/lib/antiAbuse';
import { playScanStart, playScanSuccess, playError } from '@/lib/sounds';
import { getCurrentLocation } from '@/lib/location';
// SplineBackground is rendered at AppShell level (root stacking context)

export default function ScanPage() {
  const router = useRouter();
  const { user, userId, isAnonymous, loading } = useUser();
  const [isScanning, setIsScanning] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastPts, setToastPts] = useState(0);
  const [abuseWarning, setAbuseWarning] = useState<string | null>(null);
  const [scansRemaining, setScansRemaining] = useState<number>(20);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // ── Load daily scans remaining once userId is known ───────────────────────
  useEffect(() => {
    if (userId) getDailyScansRemaining(userId).then(setScansRemaining);
  }, [userId]);

  // ── Onboarding modal (shown once after first Google sign-in) ──────────────
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardName, setOnboardName] = useState('');
  const [onboardCity, setOnboardCity] = useState('');
  const [isSavingOnboard, setIsSavingOnboard] = useState(false);

  // prevIsAnonymousRef tracks the PREVIOUS value of isAnonymous so we can
  // detect the exact anonymous→Google transition without false positives from
  // onSnapshot re-fires or page remounts.
  const prevIsAnonymousRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (loading) return;
    const wasAnonymous = prevIsAnonymousRef.current;
    prevIsAnonymousRef.current = isAnonymous;

    // Only act when we transition from anonymous (true) → signed-in (false)
    if (wasAnonymous === true && !isAnonymous && user) {
      // useUser already syncs name from Google before setUser(), so we can't
      // check user.name === 'EcoWarrior'. Use city as the "never-set-up" indicator.
      if (!user.city || user.city === 'India') {
        // Pre-fill name from Google display name; city must be typed by user
        setOnboardName(auth.currentUser?.displayName ?? user.name ?? '');
        setOnboardCity('');
        setShowOnboarding(true);
      }
    }
  }, [isAnonymous, loading, user]);

  async function handleSaveOnboarding() {
    if (!userId) return;
    setIsSavingOnboard(true);
    try {
      if (onboardName.trim()) await updateUserName(userId, onboardName.trim());
      if (onboardCity.trim()) await updateUserCity(userId, onboardCity.trim());
    } finally {
      setIsSavingOnboard(false);
      setShowOnboarding(false);
    }
  }

  const handleLogin = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) { console.error('Login failed', e); }
  };
  const handleLogout = async () => { await signOut(auth); };

  const onInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playScanStart();
    setIsScanning(true);
    setAbuseWarning(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result as string;
      // Strip data-URI prefix for abuse-check hashing and API payload
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      try {
        const res = await fetch('/api/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image, mimeType: file.type }),
        });
        const result = await res.json();

        // ── Anti-abuse check (runs once, after we have the real category) ──
        if (userId) {
          const abuseCheck = await checkScanAllowed(userId, base64Data, result.category);

          if (!abuseCheck.allowed) {
            // Cooldown or daily limit — block navigation entirely
            playError();
            setAbuseWarning(abuseCheck.warningMessage);
            setIsScanning(false);
            return;
          }

          if (abuseCheck.reason === 'duplicate_image') {
            result.points_earned = 0;
            setAbuseWarning(abuseCheck.warningMessage);
          } else if (abuseCheck.pointsMultiplier < 1.0) {
            result.points_earned = Math.round((result.points_earned || 10) * abuseCheck.pointsMultiplier);
            setAbuseWarning(abuseCheck.warningMessage);
          }

          // Decrement local counter optimistically
          setScansRemaining((prev) => Math.max(0, prev - 1));
        }
        // ── End abuse check ─────────────────────────────────────────────────

        sessionStorage.setItem('lastScanResult', JSON.stringify(result));
        try { sessionStorage.setItem('lastScanImage', base64Image); } catch {
          console.warn('Image too large for sessionStorage.');
        }
        if (userId) {
          try {
            const coords = await getCurrentLocation();
            await recordScan(userId, result, { lat: coords.lat, lng: coords.lng });
          }
          catch (fbErr) { console.error('recordScan failed (non-blocking):', fbErr); }
        }
        playScanSuccess();
        setToastPts(result.points_earned || 10);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2200);
        setTimeout(() => router.push('/result'), 800);
      } catch (err) {
        console.error('Scan failed', err);
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'var(--bg-deep)' }}>
      <div className="w-9 h-9 rounded-full border-2 border-t-transparent animate-spin mb-3"
        style={{ borderColor: '#10B981', borderTopColor: 'transparent' }} />
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#34D399' }}>
        Initializing EcoScan…
      </p>
    </div>
  );

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-x-hidden page-enter"
      style={{ background: 'transparent' }}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault(); setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) { const dt = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>; onInputChange(dt); }
      }}
    >
      {/* ── Toast ────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none
              flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg,#059669,#10B981)', color: '#060A06',
              boxShadow: '0 0 30px rgba(16,185,129,0.35)' }}
          >
            <Zap size={14} />+{toastPts} EcoPoints earned!
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="glass-card mx-4 mt-5 px-4 py-3 rounded-2xl z-10 relative flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.12)' }}>
            <Leaf size={16} style={{ color: '#10B981' }} />
          </div>
          <div>
            <p className="text-sm font-bold leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>
              EcoScan
            </p>
            <p className="text-[9px] font-medium italic mt-0.5" style={{ color: 'rgba(52,211,153,0.6)' }}>
              – scan. sort. save. –
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isAnonymous && (
            <div className="flex flex-col items-center">
              <div className="glass-card px-4 py-2 rounded-full flex items-center gap-1.5"
                style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
                <Zap size={12} style={{ color: '#34D399' }} />
                <span className="text-xs font-black tabular-nums" style={{ color: '#34D399' }}>
                  {user?.totalPoints ?? 0} pts
                </span>
              </div>
              <p className="text-[9px] text-center mt-1" style={{ color: 'var(--text-muted)' }}>
                {scansRemaining} scans left today
              </p>
            </div>
          )}
          {!isAnonymous ? (
            <button onClick={handleLogout}
              className="w-9 h-9 rounded-full flex items-center justify-center border transition-colors"
              style={{ borderColor: 'rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.7)' }}>
              <LogOut size={14} />
            </button>
          ) : (
            <button onClick={handleLogin}
              className="px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,#059669,#10B981)', color: '#060A06' }}>
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────────────── */}
      {/* pointer-events: none on wrapper so Spline scene is draggable in the gaps */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-6 gap-6 z-10 relative pointer-events-none">

        {/* Headline */}
        <div className="text-center pointer-events-none">
          <p className="text-sm italic mb-1" style={{ color: 'rgba(52,211,153,0.7)' }}>
            – identify any waste –
          </p>
          <h1 className="font-black tracking-tighter leading-none"
            style={{ fontSize: 44, color: 'var(--text-primary)' }}>
            EcoScan
          </h1>
        </div>

        {/* Scan circle + concentric rings */}
        <div className="relative flex items-center justify-center pointer-events-none glow-pulse">
          {/* Rings */}
          {[300, 240, 180, 130].map((size, i) => (
            <div key={size}
              className={`absolute rounded-full scan-ring ${i === 1 ? 'scan-ring-delay-1' : i === 2 ? 'scan-ring-delay-2' : ''}`}
              style={{
                width: size, height: size,
                border: `1px solid rgba(16,185,129,${[0.05, 0.08, 0.12, 0.2][i]})`,
              }}
            />
          ))}

          <motion.button
            whileTap={{ scale: 0.93 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => cameraInputRef.current?.click()}
            disabled={isScanning}
            className="relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center overflow-hidden pointer-events-auto"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(52,211,153,0.2), rgba(16,185,129,0.05))',
              border: '2px solid rgba(16,185,129,0.3)',
              boxShadow: '0 0 40px rgba(16,185,129,0.2), 0 0 80px rgba(16,185,129,0.08), inset 0 0 30px rgba(16,185,129,0.05)',
            }}
          >
            {isScanning ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: '#34D399', borderTopColor: 'transparent' }} />
                <span className="text-[9px] font-bold uppercase tracking-widest animate-pulse"
                  style={{ color: '#34D399' }}>
                  Analyzing
                </span>
              </div>
            ) : (
              <>
                <Camera size={36} style={{ color: '#34D399' }} />
                <span className="text-[9px] font-bold uppercase tracking-widest mt-1"
                  style={{ color: 'rgba(52,211,153,0.7)' }}>
                  Scan
                </span>
              </>
            )}
          </motion.button>
        </div>

        <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
          {dragActive ? 'Drop to scan!' : 'or drag & drop anything'}
        </p>

        {/* Action buttons */}
        <div className="w-full max-w-xs flex flex-col gap-2.5 pointer-events-auto">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => cameraInputRef.current?.click()}
            disabled={isScanning}
            className="w-full py-4 rounded-2xl font-black text-lg tracking-tight flex items-center justify-center gap-2 disabled:opacity-40 glow-brand glass-button-primary"
            style={{ background: 'linear-gradient(135deg,#059669,#10B981)', color: '#060A06' }}
          >
            {isScanning ? (
              <span className="flex items-center gap-2">
                <span className="inline-flex gap-1">
                  {[0, 0.15, 0.3].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: '#060A06', animationDelay: `${d}s` }} />
                  ))}
                </span>
                Analyzing...
              </span>
            ) : 'Scan Waste'}
          </motion.button>

          <button
            onClick={() => galleryInputRef.current?.click()}
            className="glass-card w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2"
            style={{ color: 'var(--text-muted)', borderColor: 'rgba(255,255,255,0.05)' }}
          >
            <Upload size={16} />
            Upload from Gallery
          </button>
        </div>

        {/* Stats row */}
        <div className="w-full max-w-xs grid grid-cols-3 gap-2 pointer-events-none">
          {[
            { num: '62M', label: 'Tonnes waste/yr' },
            { num: '20%', label: 'Segregated' },
            { num: '4', label: 'Categories' },
          ].map(({ num, label }) => (
            <div key={label} className="glass-card glass-shine rounded-xl p-3 text-center">
              <p className="font-black text-base tabular-nums" style={{ color: '#34D399' }}>{num}</p>
              <p className="text-[9px] font-medium mt-0.5 leading-tight" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Abuse warning banner ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {abuseWarning && (
          <motion.div
            key="abuse-warning"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
            className="mx-4 mt-3 p-3 rounded-xl flex items-start gap-2 pointer-events-auto z-10 relative"
            style={{
              background: 'rgba(245,158,11,0.10)',
              border: '1px solid rgba(245,158,11,0.20)',
            }}
          >
            <span className="text-lg leading-none">⚠️</span>
            <p className="text-xs leading-relaxed" style={{ color: '#FCD34D' }}>{abuseWarning}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hidden inputs ─────────────────────────────────────────────────────── */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onInputChange} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} />

      {/* ── Onboarding modal (first-time Google sign-in) ─────────────────────── */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            key="onboard-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-5"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
          >
            <motion.div
              key="onboard-card"
              initial={{ scale: 0.9, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="glass-card w-full max-w-sm p-6 flex flex-col gap-5 relative"
            >
              {/* Close / skip */}
              <button
                onClick={() => setShowOnboarding(false)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
              >
                <X size={14} />
              </button>

              {/* Heading */}
              <div className="text-center pt-1">
                <div className="text-4xl mb-3">🌿</div>
                <h2 className="font-black text-xl tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Welcome to EcoScan!
                </h2>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Quick setup — takes 10 seconds
                </p>
              </div>

              {/* Inputs */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Your Name
                  </label>
                  <input
                    value={onboardName}
                    onChange={(e) => setOnboardName(e.target.value)}
                    placeholder="e.g. Adarsh"
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none"
                    style={{
                      background: 'rgba(16,185,129,0.07)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Your City
                  </label>
                  <input
                    value={onboardCity}
                    onChange={(e) => setOnboardCity(e.target.value)}
                    placeholder="e.g. Gwalior"
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none"
                    style={{
                      background: 'rgba(16,185,129,0.07)',
                      border: '1px solid rgba(16,185,129,0.2)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowOnboarding(false)}
                  className="py-3 px-4 rounded-xl text-sm font-semibold transition-colors"
                  style={{ color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Skip
                </button>
                <button
                  onClick={handleSaveOnboarding}
                  disabled={isSavingOnboard || (!onboardName.trim() && !onboardCity.trim())}
                  className="flex-1 py-3 rounded-xl text-sm font-black tracking-tight disabled:opacity-40 transition-all"
                  style={{ background: 'linear-gradient(135deg,#059669,#10B981)', color: '#060A06' }}
                >
                  {isSavingOnboard ? 'Saving…' : 'Start Scanning 🌱'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
