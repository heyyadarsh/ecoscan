'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, Crown, Zap, Users, RotateCcw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useUser } from '@/hooks/useUser';
import { getUserRank } from '@/lib/points';
import type { User } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Safely coerce Firestore values to a display number — prevents NaN showing in UI
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeNum = (val: any): number => {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

function initial(name: string) {
  return (name?.[0] ?? '?').toUpperCase();
}

function truncate(name: string, max = 10) {
  return name.length > max ? name.slice(0, max) + '…' : name;
}

// Deterministic hue from name so every user gets a consistent avatar colour
function avatarGradient(name: string, alpha = 1) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `linear-gradient(135deg, hsl(${h},60%,35%), hsl(${(h + 40) % 360},60%,25%))`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PodiumItem({
  user,
  rank,
  delay,
}: {
  user: User;
  rank: 1 | 2 | 3;
  delay: number;
}) {
  const sizes: Record<1 | 2 | 3, string> = {
    1: 'w-20 h-20 text-3xl',
    2: 'w-16 h-16 text-2xl',
    3: 'w-14 h-14 text-xl',
  };
  const borders: Record<1 | 2 | 3, string> = {
    1: 'border-yellow-400 shadow-yellow-400/30',
    2: 'border-gray-300 shadow-gray-300/20',
    3: 'border-orange-400 shadow-orange-400/20',
  };
  const podiumH: Record<1 | 2 | 3, string> = { 1: 'h-16', 2: 'h-12', 3: 'h-8' };
  const podiumBg: Record<1 | 2 | 3, string> = {
    1: 'bg-yellow-500/20 border-yellow-500/30',
    2: 'bg-gray-500/20 border-gray-500/30',
    3: 'bg-orange-500/20 border-orange-500/30',
  };
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const pointColor: Record<1 | 2 | 3, string> = {
    1: 'text-yellow-400',
    2: 'text-gray-300',
    3: 'text-orange-400',
  };
  const pts = safeNum(user.totalPoints);

  const initials = (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.45, delay, type: 'spring', bounce: 0.35 }}
      className="flex flex-col items-center"
    >
      {rank === 1 && (
        <motion.span
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="text-2xl mb-1"
        >
          👑
        </motion.span>
      )}

      <div
        className={`${sizes[rank]} rounded-full border-4 ${borders[rank]} shadow-lg flex items-center justify-center font-black text-white`}
        style={{ background: avatarGradient(user.name) }}
      >
        {initial(user.name)}
      </div>

      <p className="text-white font-semibold text-xs mt-2 text-center leading-tight">
        {truncate(user.name)}
      </p>

      <div className={`flex items-center gap-0.5 mt-1 ${pointColor[rank]}`}>
        <Zap size={11} />
        <span className="text-xs font-bold">{pts}</span>
      </div>

      {/* Podium block */}
      <div
        className={`${podiumH[rank]} w-20 mt-2 border rounded-t-lg flex items-center justify-center text-lg ${podiumBg[rank]}`}
      >
        {medals[rank]}
      </div>
    </motion.div>
  );

  return initials;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 bg-[#141414] rounded-xl p-3 mb-2">
      <div className="shimmer-load w-6 h-4 rounded" />
      <div className="shimmer-load w-10 h-10 rounded-full" />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="shimmer-load h-3 w-28 rounded" />
        <div className="shimmer-load h-2.5 w-16 rounded" />
      </div>
      <div className="shimmer-load h-4 w-12 rounded" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'weekly' | 'alltime'>('weekly');
  const [userRank, setUserRank] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const { leaders, loading } = useLeaderboard(activeTab, refreshKey);
  const { user, userId } = useUser();

  const fetchRank = useCallback(async () => {
    if (!userId) return;
    try {
      const rank = await getUserRank(userId, activeTab);
      setUserRank(rank);
    } catch {
      // silently ignore
    }
  }, [userId, activeTab]);

  useEffect(() => {
    fetchRank();
  }, [fetchRank, refreshKey]);

  function handleRefresh() {
    setRefreshKey((k) => k + 1);
  }

  // Split podium (top 3) from rest
  const podium = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-b from-[#0f1f0f] to-[#0A0A0A] px-4 pt-6 pb-4">
        {/* Live indicator */}
        <div className="absolute top-6 right-4 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-emerald-400 text-xs font-medium">Live</span>
        </div>

        <div className="flex items-center gap-3 mb-1">
          <Trophy size={28} className="text-[#F59E0B]" />
          <h1 className="text-white font-bold text-xl">EcoLeaders</h1>
        </div>
        <p className="text-gray-500 text-sm">Gwalior Waste Warriors 🌱</p>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'weekly' | 'alltime')}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="relative flex items-center px-4 pt-2 pb-0">
          <TabsList
            variant="line"
            className="w-full justify-start gap-0 bg-transparent border-b border-white/[0.08] rounded-none h-auto pb-0 p-0"
          >
            <TabsTrigger
              value="weekly"
              className="px-4 py-2.5 text-sm font-semibold rounded-none border-0
                data-active:text-white data-active:after:bg-emerald-400
                text-gray-500 hover:text-gray-300"
            >
              🔥 This Week
            </TabsTrigger>
            <TabsTrigger
              value="alltime"
              className="px-4 py-2.5 text-sm font-semibold rounded-none border-0
                data-active:text-white data-active:after:bg-emerald-400
                text-gray-500 hover:text-gray-300"
            >
              ⚡ All Time
            </TabsTrigger>
          </TabsList>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="ml-auto shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 transition-colors disabled:opacity-40"
            aria-label="Refresh leaderboard"
          >
            <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* ── Shared content (same for both tabs) ──────────────────────────── */}
        {(['weekly', 'alltime'] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-4 pb-4">

              {/* Empty state */}
              {!loading && leaders.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
                  <span className="text-6xl mb-4">🏆</span>
                  <p className="text-white font-semibold text-lg">No rankings yet</p>
                  <p className="text-gray-500 text-sm mt-1 mb-6">Be the first to scan waste!</p>
                  <button
                    onClick={() => router.push('/')}
                    className="bg-emerald-500 text-black font-bold px-6 py-3 rounded-xl"
                  >
                    Start Scanning
                  </button>
                </div>
              )}

              {/* ── Podium ─────────────────────────────────────────────────── */}
              {loading ? (
                <div className="flex items-end justify-center gap-6 py-8">
                  {[20, 24, 16].map((h, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className={`shimmer-load rounded-full`} style={{ width: h === 24 ? 80 : h === 20 ? 64 : 56, height: h === 24 ? 80 : h === 20 ? 64 : 56 }} />
                      <div className="shimmer-load h-3 w-16 rounded" />
                      <div className={`shimmer-load rounded-t-lg w-20`} style={{ height: h === 24 ? 64 : h === 20 ? 48 : 32 }} />
                    </div>
                  ))}
                </div>
              ) : podium.length >= 3 ? (
                <AnimatePresence>
                  <div className="flex items-end justify-center gap-4 py-6">
                    {/* 2nd — left */}
                    <PodiumItem user={podium[1]} rank={2} delay={0.15} />
                    {/* 1st — centre (rendered between 2nd and 3rd so natural DOM order = visual order) */}
                    <PodiumItem user={podium[0]} rank={1} delay={0} />
                    {/* 3rd — right */}
                    <PodiumItem user={podium[2]} rank={3} delay={0.25} />
                  </div>
                </AnimatePresence>
              ) : null}

              {/* ── Ranks 4–10 ─────────────────────────────────────────────── */}
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : rest.map((leader, idx) => {
                    const rank = idx + 4;
                    const isCurrentUser = leader.id === userId;
                    return (
                      <motion.div
                        key={leader.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.06 }}
                        className={`flex items-center gap-3 rounded-xl p-3 mb-2 border ${
                          isCurrentUser
                            ? 'bg-emerald-500/5 border-emerald-500/30'
                            : 'bg-[#141414] border-white/5'
                        }`}
                      >
                        <span className="text-gray-500 font-bold w-6 text-center text-sm">
                          {rank}
                        </span>

                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-emerald-300 shrink-0"
                          style={{ background: avatarGradient(leader.name) }}
                        >
                          {initial(leader.name)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">
                            {leader.name}
                          </p>
                          <p className="text-gray-500 text-xs">{leader.scanCount} scans</p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Flame size={13} className="text-orange-400" />
                          <span className="text-white font-bold text-sm">
                            {activeTab === 'weekly' ? safeNum(leader.weeklyPoints) : safeNum(leader.totalPoints)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* ── Your Rank Card (sticky bottom) ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mx-4 mb-4 bg-[#141414] border border-emerald-500/20 rounded-2xl p-4 shrink-0"
      >
        <p className="text-gray-500 text-xs mb-2 flex items-center gap-1">
          <Users size={11} />
          Your Rank
        </p>

        {!user ? (
          <p className="text-gray-400 text-sm">Keep scanning to rank up! 🌱</p>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-black text-3xl leading-none">
              {!userRank || isNaN(userRank) ? 'Unranked' : `#${userRank}`}
            </span>

            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
              style={{ background: avatarGradient(user.name) }}
            >
              {initial(user.name)}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{user.name}</p>
              <p className="text-gray-500 text-xs">{safeNum(user.scanCount)} scans</p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Zap size={13} className="text-emerald-400" />
              <span className="text-emerald-400 font-bold text-sm">
                {activeTab === 'weekly' ? safeNum(user.weeklyPoints) : safeNum(user.totalPoints)} pts
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
