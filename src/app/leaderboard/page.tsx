'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, Zap, Users, RotateCcw, ShieldAlert, ChevronDown } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useUser } from '@/hooks/useUser';
import { getUserRank, seedLeaderboardForDemo } from '@/lib/points';
import { getDailyScansRemaining } from '@/lib/antiAbuse';
import type { User } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeNum = (val: any): number => { const n = Number(val); return isNaN(n) ? 0 : n; };
const initial = (name: string) => (name?.[0] ?? '?').toUpperCase();
const truncate = (name: string, max = 12) => name.length > max ? name.slice(0, max) + '…' : name;

const RANK_GRADIENTS: Record<1 | 2 | 3, string> = {
  1: 'linear-gradient(135deg,#F59E0B,#D97706)',
  2: 'linear-gradient(135deg,#9CA3AF,#6B7280)',
  3: 'linear-gradient(135deg,#CD7C2F,#92400E)',
};

// ─── Podium item ─────────────────────────────────────────────────────────────

function PodiumItem({
  user, rank, delay, isCurrentUser = false,
}: { user: User; rank: 1 | 2 | 3; delay: number; isCurrentUser?: boolean }) {
  const avatarSizes: Record<1 | 2 | 3, number> = { 1: 80, 2: 64, 3: 56 };
  const borderColors: Record<1 | 2 | 3, string> = {
    1: '#F59E0B', 2: '#9CA3AF', 3: '#CD7C2F',
  };
  const podiumH: Record<1 | 2 | 3, number> = { 1: 64, 2: 48, 3: 32 };
  const medals: Record<1 | 2 | 3, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const pts = safeNum(user.totalPoints);
  const sz = avatarSizes[rank];

  return (
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
        >👑</motion.span>
      )}

      <div
        className="rounded-full flex items-center justify-center font-black text-white"
        style={{
          width: sz, height: sz,
          background: RANK_GRADIENTS[rank],
          border: `${rank === 1 ? 4 : 3}px solid ${borderColors[rank]}`,
          boxShadow: rank === 1
            ? `0 0 30px rgba(245,158,11,0.4)${isCurrentUser ? ', 0 0 0 3px #34D399' : ''}`
            : isCurrentUser ? '0 0 0 3px #34D399' : undefined,
          fontSize: rank === 1 ? 28 : rank === 2 ? 22 : 18,
        }}
      >
        {initial(user.name)}
      </div>

      <p className="font-semibold text-xs mt-2 text-center leading-tight"
        style={{ color: 'var(--text-primary)' }}>
        {truncate(user.name, 9)}
      </p>

      <div className="flex items-center gap-0.5 mt-1" style={{ color: borderColors[rank] }}>
        <Zap size={10} />
        <span className="text-xs font-black tabular-nums">{pts}</span>
      </div>

      {/* Podium block */}
      <div
        className="glass-card w-20 mt-2 rounded-t-xl flex items-center justify-center text-lg"
        style={{ height: podiumH[rank], borderRadius: '12px 12px 0 0', borderColor: `${borderColors[rank]}33` }}
      >
        {medals[rank]}
      </div>
    </motion.div>
  );
}

function SkeletonRow() {
  return (
    <div className="glass-card flex items-center gap-3 rounded-2xl p-3 mb-2">
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

// ─── Main ────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'weekly' | 'alltime'>('weekly');
  const [userRank, setUserRank] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const { leaders, loading, permissionError } = useLeaderboard(activeTab, refreshKey);
  const { user, userId } = useUser();
  const [scansRemaining, setScansRemaining] = useState<number>(20);
  const [pointsInfoOpen, setPointsInfoOpen] = useState(false);

  const fetchRank = useCallback(async () => {
    if (!userId) return;
    try { setUserRank(await getUserRank(userId, activeTab)); } catch { /* silent */ }
  }, [userId, activeTab]);

  useEffect(() => { fetchRank(); }, [fetchRank, refreshKey]);

  useEffect(() => {
    if (userId) getDailyScansRemaining(userId).then(setScansRemaining);
  }, [userId]);

  // Seed demo leaderboard data once if empty (and no permission error)
  useEffect(() => {
    if (!loading && !permissionError && leaders.length === 0) {
      seedLeaderboardForDemo().catch(() => {/* non-critical */});
    }
  }, [loading, permissionError, leaders.length]);

  // Filter out users with no scans (no cheated/placeholder accounts)
  const activeLeaders = leaders.filter((l) => (l.scanCount || 0) > 0);
  const podium = activeLeaders.slice(0, 3);
  const rest = activeLeaders.slice(3);

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: 'var(--bg-deep)' }}>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="relative px-4 pt-6 pb-4"
        style={{ background: 'linear-gradient(180deg,rgba(245,158,11,0.08) 0%,transparent 100%)' }}>

        <div className="absolute top-6 right-4 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-75" />
            <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold" style={{ color: '#34D399' }}>Live</span>
        </div>

        <div className="flex items-center gap-3 mb-0.5">
          <Trophy size={26} style={{ color: '#F59E0B' }} />
          <h1 className="font-black text-2xl" style={{ color: 'var(--text-primary)' }}>EcoLeaders</h1>
        </div>
        <p className="text-xs italic" style={{ color: 'rgba(251,191,36,0.6)' }}>
          – Gwalior Waste Warriors 🌱 –
        </p>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'weekly' | 'alltime')}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="relative flex items-center px-4 pt-2 pb-0">
          <div className="glass-card flex p-1 gap-1 rounded-xl flex-1">
            {(['weekly', 'alltime'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                style={
                  activeTab === tab
                    ? { background: '#10B981', color: '#060A06' }
                    : { color: 'var(--text-muted)' }
                }
              >
                {tab === 'weekly' ? '🔥 This Week' : '⚡ All Time'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            className="ml-3 w-9 h-9 glass-card flex items-center justify-center rounded-full disabled:opacity-40 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Refresh leaderboard"
          >
            <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {(['weekly', 'alltime'] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-4 pb-4">

              {/* Permission error state */}
              {!loading && permissionError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center flex-1 py-12 text-center px-4"
                >
                  <ShieldAlert size={40} style={{ color: '#F59E0B' }} className="mb-3" />
                  <p className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                    Firestore Rules Blocked
                  </p>
                  <p className="text-xs leading-relaxed mb-5" style={{ color: 'var(--text-muted)' }}>
                    Update your Firebase rules to allow reading all user profiles.
                    See instructions in the chat.
                  </p>
                  <button onClick={() => setRefreshKey(k => k + 1)}
                    className="glass-card flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                    style={{ color: '#34D399' }}>
                    <RotateCcw size={13} /> Retry
                  </button>
                </motion.div>
              )}

              {/* Empty state (no data, no error) */}
              {!loading && !permissionError && activeLeaders.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
                  <span className="text-6xl mb-4">🏆</span>
                  <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>No rankings yet</p>
                  <p className="text-sm mt-1 mb-6" style={{ color: 'var(--text-muted)' }}>Be the first to scan waste!</p>
                  <button onClick={() => router.push('/')}
                    className="font-black px-6 py-3 rounded-2xl"
                    style={{ background: 'linear-gradient(135deg,#059669,#10B981)', color: '#060A06' }}>
                    Start Scanning
                  </button>
                </div>
              )}

              {/* Podium */}
              {loading ? (
                <div className="flex items-end justify-center gap-6 py-8">
                  {[64, 80, 56].map((sz, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="shimmer-load rounded-full" style={{ width: sz, height: sz }} />
                      <div className="shimmer-load h-3 w-16 rounded" />
                      <div className="shimmer-load rounded-t-xl w-20" style={{ height: [48, 64, 32][i] }} />
                    </div>
                  ))}
                </div>
              ) : podium.length >= 3 ? (
                <AnimatePresence>
                  <div className="flex items-end justify-center gap-4 py-6">
                    <PodiumItem user={podium[1]} rank={2} delay={0.15} isCurrentUser={podium[1].id === userId} />
                    <PodiumItem user={podium[0]} rank={1} delay={0}    isCurrentUser={podium[0].id === userId} />
                    <PodiumItem user={podium[2]} rank={3} delay={0.25} isCurrentUser={podium[2].id === userId} />
                  </div>
                </AnimatePresence>
              ) : null}

              {/* Ranks 4-10 */}
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : rest.map((leader, idx) => {
                    const rank = idx + 4;
                    const isCurrent = leader.id === userId;
                    return (
                      <motion.div
                        key={leader.id}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, delay: idx * 0.05 }}
                        className="glass-card flex items-center gap-3 rounded-2xl p-3 mb-2"
                        style={isCurrent ? { borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.05)' } : {}}
                      >
                        <span className="font-bold w-6 text-center text-sm"
                          style={{ color: 'var(--text-muted)' }}>{rank}</span>

                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
                          style={{ background: `linear-gradient(135deg,hsl(${leader.name.charCodeAt(0)*7%360},50%,30%),hsl(${(leader.name.charCodeAt(0)*7+40)%360},50%,20%))` }}
                        >
                          {initial(leader.name)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                            {leader.name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{leader.scanCount} scans</p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Flame size={13} style={{ color: '#F97316' }} />
                          <span className="font-bold text-sm tabular-nums" style={{ color: 'var(--text-primary)' }}>
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

      {/* ── Your Stats mini row ────────────────────────────────────────────────── */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="flex gap-2 mx-4 mb-2 shrink-0"
        >
          {[
            { label: 'Today', value: `${20 - scansRemaining}/20`, sub: 'scans used' },
            { label: 'Streak', value: `${safeNum(user.streak)}🔥`, sub: 'days' },
            { label: 'This Week', value: `${safeNum(user.weeklyPoints)}`, sub: 'pts' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="glass-card flex-1 rounded-xl px-2 py-2 text-center">
              <p className="text-[9px] uppercase tracking-widest font-semibold mb-0.5"
                style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="font-black text-sm tabular-nums leading-none" style={{ color: '#34D399' }}>{value}</p>
              <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Your Rank card ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="glass-card mx-4 mb-3 p-4 rounded-2xl shrink-0"
        style={{ borderColor: 'rgba(16,185,129,0.2)' }}
      >
        <p className="text-xs mb-2 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <Users size={11} /> Your Rank
        </p>

        {!user ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Keep scanning to rank up! 🌱</p>
        ) : (
          <div className="flex items-center gap-3">
            <span className="font-black text-3xl leading-none" style={{ color: '#34D399' }}>
              {!userRank || isNaN(userRank) ? 'Unranked' : `#${userRank}`}
            </span>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
              style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
            >
              {initial(user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{safeNum(user.scanCount)} scans</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Zap size={13} style={{ color: '#34D399' }} />
              <span className="font-bold text-sm tabular-nums" style={{ color: '#34D399' }}>
                {activeTab === 'weekly' ? safeNum(user.weeklyPoints) : safeNum(user.totalPoints)} pts
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── How EcoPoints Work — collapsible ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="glass-card mx-4 mb-4 rounded-2xl shrink-0 overflow-hidden"
      >
        <button
          onClick={() => setPointsInfoOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            📊 How EcoPoints Work
          </span>
          <motion.span animate={{ rotate: pointsInfoOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {pointsInfoOpen && (
            <motion.div
              key="points-info"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 flex flex-col gap-1.5"
                style={{ borderTop: '1px solid rgba(16,185,129,0.08)' }}>
                {[
                  '♻️  Dry / Wet waste scan → 10 pts',
                  '⚠️  Hazardous waste scan → 20 pts',
                  '💻  E-Waste scan → 25 pts',
                  '✅  Correct feedback → +5 pts',
                  '🔁  Duplicate image → 0 pts (no cheating!)',
                  '📅  Daily limit: 20 scans',
                  '🌈  Mix categories for full points',
                ].map((line) => (
                  <p key={line} className="text-xs leading-relaxed pt-1.5"
                    style={{ color: 'var(--text-muted)' }}>
                    {line}
                  </p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
