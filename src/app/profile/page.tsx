'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Edit2, Check, Zap, Camera, Flame, Calendar, Leaf, Award, Trophy, LogOut, X, MapPin, FileText } from 'lucide-react';
import { signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useUser } from '@/hooks/useUser';
import { useScanHistory } from '@/hooks/useScanHistory';
import { updateUserName, updateUserCity } from '@/lib/points';
import { CATEGORY_CONFIG } from '@/constants/wasteConfig';
import type { WasteCategory } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(timestamp: number): string {
  const sec = Math.floor((Date.now() - timestamp) / 1000);
  const min = Math.floor(sec / 60), hr = Math.floor(min / 60), day = Math.floor(hr / 24);
  if (sec < 60) return 'just now';
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  return new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const initial = (name: string) => (name?.[0] ?? '?').toUpperCase();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safe = (val: any) => (isNaN(Number(val)) || val == null ? 0 : Number(val));

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay },
});

// ─── Component ───────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { user, userId, isAnonymous, loading, refreshUser } = useUser();
  const { scans, loading: scansLoading } = useScanHistory(userId);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isNewUser = user?.name === 'EcoWarrior' && user?.city === 'India';
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const showSetupBanner = isNewUser && !bannerDismissed;
  const [bannerName, setBannerName] = useState('');
  const [bannerCity, setBannerCity] = useState('');
  const [isSavingBanner, setIsSavingBanner] = useState(false);

  async function handleSaveBanner() {
    if (!userId) return;
    const tn = bannerName.trim(), tc = bannerCity.trim();
    if (!tn && !tc) { setBannerDismissed(true); return; }
    setIsSavingBanner(true);
    try {
      if (tn) await updateUserName(userId, tn);
      if (tc) await updateUserCity(userId, tc);
      await refreshUser();
      setBannerDismissed(true);
    } finally { setIsSavingBanner(false); }
  }

  async function handleSignOut() { await signOut(auth); router.push('/'); }
  async function handleGoogleSignIn() {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) { console.error('Sign-in failed', e); }
  }
  async function handleSaveName() {
    if (!userId || !nameInput.trim()) return;
    setIsSaving(true);
    try { await updateUserName(userId, nameInput.trim()); await refreshUser(); }
    finally { setIsSaving(false); setIsEditingName(false); }
  }
  async function handleEditCity() {
    const nc = window.prompt('Enter your city:', user?.city ?? '');
    if (!nc?.trim() || !userId) return;
    await updateUserCity(userId, nc.trim()); await refreshUser();
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const categoryCounts: Record<WasteCategory, number> = { dry: 0, wet: 0, hazardous: 0, ewaste: 0 };
  for (const s of scans) {
    const cat = s.category?.toLowerCase() as WasteCategory;
    if (cat in categoryCounts) categoryCounts[cat]++;
  }
  const pieData = (Object.keys(CATEGORY_CONFIG) as WasteCategory[]).map((cat) => ({
    name: CATEGORY_CONFIG[cat].label, value: categoryCounts[cat],
    color: CATEGORY_CONFIG[cat].color, emoji: CATEGORY_CONFIG[cat].emoji,
  }));
  const hasPieData = pieData.some((d) => d.value > 0);
  const totalCO2 = scans.reduce((sum, s) => sum + (s.co2_saved_kg ?? 0), 0);
  const ewasteCount = scans.filter((s) => s.category?.toLowerCase() === 'ewaste').length;

  const achievements = [
    { id: 'first_scan', icon: '🌱', title: 'First Step', desc: 'First scan', unlocked: safe(user?.scanCount) >= 1 },
    { id: 'scan_10', icon: '🔟', title: 'Scan Pro', desc: '10 scans', unlocked: safe(user?.scanCount) >= 10 },
    { id: 'scan_50', icon: '🏆', title: 'Eco Hero', desc: '50 scans', unlocked: safe(user?.scanCount) >= 50 },
    { id: 'ewaste', icon: '💻', title: 'E-Warrior', desc: 'Any e-waste scan', unlocked: scans.some((s) => s.category?.toLowerCase() === 'ewaste') },
    { id: 'hazardous', icon: '⚗️', title: 'Safety First', desc: 'Hazardous scan', unlocked: scans.some((s) => s.category?.toLowerCase() === 'hazardous') },
    { id: 'streak_7', icon: '🔥', title: 'On Fire', desc: '7-day streak', unlocked: safe(user?.streak) >= 7 },
    { id: 'points_100', icon: '⚡', title: 'Point Master', desc: '100+ points', unlocked: safe(user?.totalPoints) >= 100 },
    { id: 'week_1', icon: '📅', title: 'Week Strong', desc: '7 scans/week', unlocked: safe(user?.weeklyPoints) >= 70 },
    { id: 'all_cats', icon: '🌈', title: 'Completionist', desc: 'All 4 categories',
      unlocked: (['dry', 'wet', 'hazardous', 'ewaste'] as WasteCategory[]).every((cat) => scans.some((s) => s.category?.toLowerCase() === cat)) },
  ];

  if (loading) return (
    <div className="flex flex-col flex-1 px-4 pt-10 gap-4" style={{ background: 'var(--bg-deep)' }}>
      <div className="flex flex-col items-center gap-3 pb-6">
        <div className="shimmer-load w-24 h-24 rounded-full" />
        <div className="shimmer-load w-32 h-5 rounded" />
        <div className="shimmer-load w-24 h-3 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer-load h-24 rounded-2xl" />)}
      </div>
    </div>
  );

  // isAnonymous comes from useUser (reactive via onAuthStateChanged)

  if (!user && !loading) return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 text-center gap-5"
      style={{ background: 'var(--bg-deep)' }}>
      <span className="text-6xl">🌿</span>
      <h2 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Sign in to EcoScan</h2>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        Track your points, scan history, and appear on the leaderboard.
      </p>
      <button onClick={handleGoogleSignIn}
        className="flex items-center gap-3 bg-white text-gray-900 font-semibold px-6 py-3 rounded-xl shadow-lg hover:bg-gray-100 transition-colors">
        <span className="text-lg">🔍</span> Sign in with Google
      </button>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 overflow-y-auto pb-8 page-enter" style={{ background: 'var(--bg-deep)' }}>

      {/* ── Setup Banner ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSetupBanner && (
          <motion.div key="banner"
            initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.3 }}
            className="mx-4 mt-4 rounded-2xl p-4 border"
            style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)' }}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <p className="text-sm font-semibold leading-snug" style={{ color: 'rgba(251,191,36,0.9)' }}>
                  Complete your profile to appear on the leaderboard!
                </p>
              </div>
              <button onClick={() => setBannerDismissed(true)} className="shrink-0 mt-0.5 opacity-50 hover:opacity-100" style={{ color: '#F59E0B' }}>
                <X size={15} />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { val: bannerName, set: setBannerName, ph: 'Your name (e.g. Rahul S.)' },
                { val: bannerCity, set: setBannerCity, ph: 'Your city (e.g. Gwalior)' },
              ].map(({ val, set, ph }) => (
                <input key={ph} type="text" value={val} onChange={(e) => set(e.target.value)} placeholder={ph}
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none transition-colors"
                  style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', border: '1px solid rgba(245,158,11,0.2)' }} />
              ))}
            </div>
            <button onClick={handleSaveBanner} disabled={isSavingBanner || (!bannerName.trim() && !bannerCity.trim())}
              className="mt-3 w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: '#F59E0B', color: '#060A06' }}>
              {isSavingBanner ? <div className="w-4 h-4 border-2 border-[#060A06] border-t-transparent rounded-full animate-spin" /> : <><Check size={14} /> Save Profile</>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="relative pb-6 pt-4 px-4 flex flex-col items-center"
        style={{ background: 'radial-gradient(ellipse at top, rgba(16,185,129,0.12) 0%, transparent 70%)' }}>

        {/* Sign out / sign in — top-right row */}
        <div className="w-full flex justify-end mb-4">
          {!isAnonymous ? (
            <button onClick={handleSignOut}
              className="glass-card flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
              style={{ color: '#F87171', borderColor: 'rgba(239,68,68,0.2)' }}>
              <LogOut size={12} /> Sign Out
            </button>
          ) : (
            <button onClick={handleGoogleSignIn}
              className="glass-card text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ color: 'var(--text-muted)' }}>
              Sign In
            </button>
          )}
        </div>

        {/* Avatar */}
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, type: 'spring', bounce: 0.3 }}
          className="w-24 h-24 rounded-full flex items-center justify-center font-black text-white mb-3"
          style={{
            fontSize: 40, background: 'linear-gradient(135deg,#10B981,#059669)',
            boxShadow: '0 0 0 4px rgba(16,185,129,0.2), 0 0 30px rgba(16,185,129,0.15)',
          }}>
          {initial(user?.name ?? 'E')}
        </motion.div>

        {/* Name row */}
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <>
              <input autoFocus value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className="text-center rounded-xl px-3 py-1 text-lg font-bold w-40 outline-none"
                style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--text-primary)', border: '1px solid rgba(16,185,129,0.3)' }} />
              <button onClick={handleSaveName} disabled={isSaving}
                className="w-8 h-8 flex items-center justify-center rounded-full disabled:opacity-50"
                style={{ background: '#10B981', color: '#060A06' }}>
                <Check size={14} />
              </button>
            </>
          ) : (
            <>
              <span className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{user?.name ?? 'EcoWarrior'}</span>
              <button onClick={() => { setNameInput(user?.name ?? ''); setIsEditingName(true); }}
                className="opacity-40 hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }}>
                <Edit2 size={13} />
              </button>
            </>
          )}
        </div>

        {/* City */}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-sm italic" style={{ color: 'rgba(52,211,153,0.7)' }}>
            EcoWarrior · {user?.city ?? 'India'}
          </span>
          <button onClick={handleEditCity} className="text-xs underline transition-colors"
            style={{ color: 'rgba(16,185,129,0.5)' }}>
            edit
          </button>
        </div>
      </div>

      {/* ── Stats Grid ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 px-4 mt-2">
        {[
          { icon: <Zap size={18} />, color: '#34D399', value: safe(user?.totalPoints), label: 'Total EcoPoints', delay: 0.05 },
          { icon: <Camera size={18} />, color: '#60A5FA', value: safe(user?.scanCount), label: 'Items Scanned', delay: 0.1 },
          { icon: <Flame size={18} />, color: '#FB923C', value: safe(user?.weeklyPoints), label: 'Points This Week', delay: 0.15 },
          { icon: <Calendar size={18} />, color: '#4ADE80', value: safe(user?.streak), label: 'Day Streak 🔥', delay: 0.2 },
        ].map((stat) => (
          <motion.div key={stat.label} {...fadeUp(stat.delay)}
            className="glass-card glass-shine rounded-2xl p-4 flex flex-col gap-1">
            <span style={{ color: stat.color }}>{stat.icon}</span>
            <span className="font-black text-2xl tabular-nums leading-tight" style={{ color: 'var(--text-primary)' }}>
              {stat.value}
            </span>
            <span className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* ── Waste Breakdown ─────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.25)} className="glass-card glass-shine mx-4 mt-4 p-4 rounded-2xl">
        <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Your Waste Profile</h3>
        {scansLoading ? (
          <div className="shimmer-load h-40 rounded-xl" />
        ) : !hasPieData ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No scans yet</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value">
                  {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0D1A0D', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12 }}
                  labelStyle={{ color: '#F0FDF4' }} itemStyle={{ color: 'rgba(240,253,244,0.6)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-1">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.emoji} {d.name}</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {/* ── Impact Card ──────────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.3)} className="glass-card glass-shine mx-4 mt-4 p-5 rounded-2xl"
        style={{ background: 'rgba(6,25,12,0.75)', borderColor: 'rgba(16,185,129,0.2)' }}>
        <h3 className="font-bold text-sm mb-4" style={{ color: '#34D399' }}>Your Impact 🌍</h3>
        <div className="flex flex-col gap-3">
          {[
            { icon: <Leaf size={18} />, val: `${totalCO2.toFixed(2)} kg`, label: 'CO₂ Saved', color: '#34D399' },
            { icon: <span className="text-lg">🌳</span>, val: `≈ ${(totalCO2 / 22).toFixed(3)}`, label: 'Trees Worth', color: '#4ADE80' },
            { icon: <span className="text-lg">💻</span>, val: String(ewasteCount), label: 'E-Waste Items Diverted', color: '#60A5FA' },
          ].map(({ icon, val, label, color }) => (
            <div key={label} className="flex items-center gap-3">
              <span style={{ color }}>{icon}</span>
              <span className="font-black text-xl tabular-nums" style={{ color: 'var(--text-primary)' }}>{val}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── EcoZone & Certificate CTAs ──────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.33)} className="grid grid-cols-2 gap-3 px-4 mt-4">
        <button onClick={() => router.push('/ecozone')}
          className="glass-card glass-shine rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition-all active:scale-[0.97]">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.12)' }}>
            <MapPin size={18} style={{ color: '#10B981' }} />
          </div>
          <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>EcoZone</span>
          <span className="text-[9px] leading-tight" style={{ color: 'var(--text-muted)' }}>
            Your green territory
          </span>
        </button>
        <button onClick={() => router.push('/certificate')}
          className="glass-card glass-shine rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition-all active:scale-[0.97]">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(52,211,153,0.12)' }}>
            <FileText size={18} style={{ color: '#34D399' }} />
          </div>
          <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Certificate</span>
          <span className="text-[9px] leading-tight" style={{ color: 'var(--text-muted)' }}>
            Carbon offset card
          </span>
        </button>
      </motion.div>

      {/* ── Achievements ─────────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.35)} className="mx-4 mt-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Trophy size={14} style={{ color: '#F59E0B' }} /> Achievements
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {achievements.map((a, idx) => (
            <motion.div key={a.id}
              initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: a.unlocked ? 1 : 0.3 }}
              transition={{ duration: 0.28, delay: 0.04 * idx }}
              className={`glass-card glass-shine flex flex-col items-center text-center p-3 rounded-2xl ${!a.unlocked ? 'grayscale' : ''}`}>
              <span className="text-2xl mb-1">{a.icon}</span>
              <span className="text-xs font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{a.title}</span>
              <span className="text-[9px] mt-0.5 leading-tight" style={{ color: 'var(--text-muted)' }}>{a.desc}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Recent Scans ──────────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.4)} className="mx-4 mt-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Award size={14} style={{ color: 'var(--text-muted)' }} /> Recent Scans
        </h3>
        {scansLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer-load h-14 rounded-2xl" />)}
          </div>
        ) : scans.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center gap-3">
            <span className="text-4xl">🌿</span>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No scans yet — start scanning waste!</p>
            <button onClick={() => router.push('/')}
              className="font-bold text-sm px-5 py-2.5 rounded-2xl mt-1"
              style={{ background: 'linear-gradient(135deg,#059669,#10B981)', color: '#060A06' }}>
              Start Scanning
            </button>
          </div>
        ) : (
          scans.slice(0, 10).map((scan, idx) => {
            const cat = scan.category?.toLowerCase() as WasteCategory;
            const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG['dry'];
            return (
              <motion.div key={scan.id ?? idx}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, delay: idx * 0.04 }}
                className="glass-card glass-shine flex items-center gap-3 rounded-2xl p-3 mb-2">
                <span className="text-2xl shrink-0">{cfg.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{scan.item_name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {cfg.label} · {timeAgo(scan.timestamp)}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${cfg.color}20`, color: cfg.color }}>
                  +{scan.points_earned}pts
                </span>
              </motion.div>
            );
          })
        )}
      </motion.div>
    </div>
  );
}
