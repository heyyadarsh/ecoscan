'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Edit2,
  Check,
  Zap,
  Camera,
  Flame,
  Calendar,
  Leaf,
  Award,
  Trophy,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useScanHistory } from '@/hooks/useScanHistory';
import { updateUserName, updateUserCity } from '@/lib/points';
import { CATEGORY_CONFIG } from '@/constants/wasteConfig';
import type { WasteCategory } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function initial(name: string) {
  return (name?.[0] ?? '?').toUpperCase();
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut', delay },
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { user, userId, loading, refreshUser } = useUser();
  const { scans, loading: scansLoading } = useScanHistory(userId);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ── Name save ──────────────────────────────────────────────────────────────
  async function handleSaveName() {
    if (!userId || !nameInput.trim()) return;
    setIsSaving(true);
    try {
      await updateUserName(userId, nameInput.trim());
      await refreshUser();
    } finally {
      setIsSaving(false);
      setIsEditingName(false);
    }
  }

  // ── City edit ─────────────────────────────────────────────────────────────
  async function handleEditCity() {
    const newCity = window.prompt('Enter your city:', user?.city ?? '');
    if (!newCity || !newCity.trim() || !userId) return;
    await updateUserCity(userId, newCity.trim());
    await refreshUser();
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const categoryCounts: Record<WasteCategory, number> = {
    dry: 0, wet: 0, hazardous: 0, ewaste: 0,
  };
  for (const s of scans) {
    const cat = s.category?.toLowerCase() as WasteCategory;
    if (cat in categoryCounts) categoryCounts[cat]++;
  }

  const pieData = (Object.keys(CATEGORY_CONFIG) as WasteCategory[]).map((cat) => ({
    name: CATEGORY_CONFIG[cat].label,
    value: categoryCounts[cat],
    color: CATEGORY_CONFIG[cat].color,
    emoji: CATEGORY_CONFIG[cat].emoji,
  }));
  const hasPieData = pieData.some((d) => d.value > 0);

  const totalCO2 = scans.reduce((sum, s) => sum + (s.co2_saved_kg ?? 0), 0);
  const treesEquivalent = (totalCO2 / 22).toFixed(3);
  const ewasteCount = scans.filter((s) => s.category?.toLowerCase() === 'ewaste').length;

  // ── Achievements ──────────────────────────────────────────────────────────
  const achievements = [
    { id: 'first_scan', icon: '🌱', title: 'First Step', desc: 'First scan',
      unlocked: (user?.scanCount ?? 0) >= 1 },
    { id: 'scan_10', icon: '🔟', title: 'Scan Pro', desc: '10 scans',
      unlocked: (user?.scanCount ?? 0) >= 10 },
    { id: 'scan_50', icon: '🏆', title: 'Eco Hero', desc: '50 scans',
      unlocked: (user?.scanCount ?? 0) >= 50 },
    { id: 'ewaste', icon: '💻', title: 'E-Warrior', desc: 'Any e-waste scan',
      unlocked: scans.some((s) => s.category?.toLowerCase() === 'ewaste') },
    { id: 'hazardous', icon: '⚗️', title: 'Safety First', desc: 'Hazardous scan',
      unlocked: scans.some((s) => s.category?.toLowerCase() === 'hazardous') },
    { id: 'streak_7', icon: '🔥', title: 'On Fire', desc: '7-day streak',
      unlocked: (user?.streak ?? 0) >= 7 },
    { id: 'points_100', icon: '⚡', title: 'Point Master', desc: '100+ points',
      unlocked: (user?.totalPoints ?? 0) >= 100 },
    { id: 'week_1', icon: '📅', title: 'Week Strong', desc: '7 scans in a week',
      unlocked: (user?.weeklyPoints ?? 0) >= 70 },
    { id: 'all_cats', icon: '🌈', title: 'Completionist', desc: 'All 4 categories',
      unlocked: (['dry', 'wet', 'hazardous', 'ewaste'] as WasteCategory[]).every(
        (cat) => scans.some((s) => s.category?.toLowerCase() === cat)
      ) },
  ];

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col flex-1 px-4 pt-10 gap-4">
        <div className="flex flex-col items-center gap-3 pb-6">
          <div className="shimmer-load w-24 h-24 rounded-full" />
          <div className="shimmer-load w-32 h-5 rounded" />
          <div className="shimmer-load w-24 h-3 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer-load h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 overflow-y-auto pb-8">

      {/* ── Section 1: Profile Header ───────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-emerald-950/40 to-transparent pb-6 pt-10 px-4 flex flex-col items-center">
        {/* Avatar */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, type: 'spring', bounce: 0.3 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600
            flex items-center justify-center text-5xl font-black text-white mb-3 shadow-lg shadow-emerald-900/40"
        >
          {initial(user?.name ?? 'E')}
        </motion.div>

        {/* Name row */}
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <>
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className="text-center bg-white/10 text-white rounded-xl px-3 py-1 text-lg font-bold
                  border border-white/20 outline-none focus:border-emerald-500 w-40"
              />
              <button
                onClick={handleSaveName}
                disabled={isSaving}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500 text-black disabled:opacity-50"
              >
                <Check size={15} />
              </button>
            </>
          ) : (
            <>
              <span className="text-white font-bold text-xl">{user?.name ?? 'EcoWarrior'}</span>
              <button
                onClick={() => { setNameInput(user?.name ?? ''); setIsEditingName(true); }}
                className="text-gray-500 hover:text-gray-300 transition-colors"
                aria-label="Edit name"
              >
                <Edit2 size={14} />
              </button>
            </>
          )}
        </div>

        {/* City / subtitle */}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-gray-500 text-sm">EcoWarrior · {user?.city ?? 'India'}</span>
          <button
            onClick={handleEditCity}
            className="text-emerald-600 text-xs underline hover:text-emerald-400 transition-colors"
          >
            Change city
          </button>
        </div>
      </div>

      {/* ── Section 2: Stats Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 px-4 mt-2">
        {[
          { icon: <Zap size={18} className="text-emerald-400" />, value: user?.totalPoints ?? 0,
            label: 'Total EcoPoints', delay: 0.05 },
          { icon: <Camera size={18} className="text-blue-400" />, value: user?.scanCount ?? 0,
            label: 'Waste Items Scanned', delay: 0.1 },
          { icon: <Flame size={18} className="text-orange-400" />, value: user?.weeklyPoints ?? 0,
            label: 'Points This Week', delay: 0.15 },
          { icon: <Calendar size={18} className="text-green-400" />, value: user?.streak ?? 0,
            label: 'Day Streak 🔥', delay: 0.2 },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            {...fadeUp(stat.delay)}
            className="bg-[#141414] rounded-2xl p-4 border border-white/5 flex flex-col gap-1"
          >
            {stat.icon}
            <span className="text-white font-black text-2xl leading-tight">{stat.value}</span>
            <span className="text-gray-500 text-[11px] leading-tight">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* ── Section 3: Waste Breakdown ───────────────────────────────────────── */}
      <motion.div {...fadeUp(0.25)} className="mx-4 mt-4 bg-[#141414] rounded-2xl p-4 border border-white/5">
        <h2 className="text-white font-semibold text-sm mb-3">Your Waste Profile</h2>

        {scansLoading ? (
          <div className="shimmer-load h-40 rounded-xl" />
        ) : !hasPieData ? (
          <p className="text-gray-500 text-sm text-center py-8">No scans yet</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#9CA3AF' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-1">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-gray-400 text-xs">{d.emoji} {d.name}</span>
                  <span className="text-white text-xs font-bold">{d.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {/* ── Section 4: Impact Summary ────────────────────────────────────────── */}
      <motion.div
        {...fadeUp(0.3)}
        className="mx-4 mt-4 bg-gradient-to-br from-emerald-950/60 to-teal-950/40
          border border-emerald-800/30 rounded-2xl p-5"
      >
        <h2 className="text-emerald-400 font-semibold text-sm mb-4">Your Impact on India 🌍</h2>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Leaf size={18} className="text-emerald-400 shrink-0" />
            <div>
              <span className="text-white font-black text-xl">{totalCO2.toFixed(2)} kg</span>
              <span className="text-gray-400 text-xs ml-2">CO₂ Saved</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-lg shrink-0">🌳</span>
            <div>
              <span className="text-white font-black text-xl">≈ {treesEquivalent}</span>
              <span className="text-gray-400 text-xs ml-2">Trees Worth</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-lg shrink-0">💻</span>
            <div>
              <span className="text-white font-black text-xl">{ewasteCount}</span>
              <span className="text-gray-400 text-xs ml-2">E-Waste Items Diverted</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Section 5: Achievements ──────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.35)} className="mx-4 mt-4">
        <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Trophy size={15} className="text-yellow-400" />
          Achievements
        </h2>

        <div className="grid grid-cols-3 gap-2">
          {achievements.map((a, idx) => (
            <motion.div
              key={a.id}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: a.unlocked ? 1 : 0.45 }}
              transition={{ duration: 0.3, delay: 0.04 * idx }}
              className={`flex flex-col items-center text-center p-3 rounded-xl border ${
                a.unlocked
                  ? 'bg-[#141414] border-white/10'
                  : 'bg-[#0d0d0d] border-white/5 grayscale'
              }`}
            >
              <span className="text-2xl mb-1">{a.icon}</span>
              <span className="text-white text-xs font-bold leading-tight">{a.title}</span>
              <span className="text-gray-500 text-[10px] mt-0.5 leading-tight">{a.desc}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Section 6: Recent Scans ──────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.4)} className="mx-4 mt-4">
        <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Award size={15} className="text-gray-400" />
          Recent Scans
        </h2>

        {scansLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shimmer-load h-14 rounded-xl" />
            ))}
          </div>
        ) : scans.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center gap-3">
            <span className="text-4xl">🌿</span>
            <p className="text-gray-400 text-sm">No scans yet — start scanning waste!</p>
            <button
              onClick={() => router.push('/')}
              className="bg-emerald-500 text-black font-bold text-sm px-5 py-2.5 rounded-xl mt-1"
            >
              Start Scanning
            </button>
          </div>
        ) : (
          scans.slice(0, 10).map((scan, idx) => {
            const cat = scan.category?.toLowerCase() as WasteCategory;
            const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG['dry'];
            return (
              <motion.div
                key={scan.id ?? idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.04 }}
                className="flex items-center gap-3 bg-[#141414] rounded-xl p-3 mb-2"
              >
                <span className="text-2xl shrink-0">{cfg.emoji}</span>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{scan.item_name}</p>
                  <p className="text-gray-500 text-xs">
                    {cfg.label} · {timeAgo(scan.timestamp)}
                  </p>
                </div>

                <span
                  className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
                >
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
