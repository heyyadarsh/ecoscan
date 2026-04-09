'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Target, Zap, Leaf, TreePine } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useScanHistory } from '@/hooks/useScanHistory';
import { getCurrentLocation } from '@/lib/location';
import type { ScanRecord, WasteCategory } from '@/types';

const EcoZoneMap = dynamic(() => import('@/components/map/EcoZoneMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full shimmer-load rounded-2xl" />,
});

function countUniqueZones(scans: ScanRecord[]): number {
  const gridSize = 0.002;
  const seen = new Set<string>();
  for (const s of scans) {
    if (!s.lat || !s.lng) continue;
    seen.add(`${Math.round(s.lat / gridSize)}_${Math.round(s.lng / gridSize)}`);
  }
  return seen.size;
}

function countCategories(scans: ScanRecord[]): number {
  const cats = new Set<WasteCategory>();
  for (const s of scans) {
    const c = s.category?.toLowerCase() as WasteCategory;
    if (c) cats.add(c);
  }
  return cats.size;
}

export default function EcoZonePage() {
  const router = useRouter();
  const { userId } = useUser();
  const { scans, loading: scansLoading } = useScanHistory(userId);

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentLocation().then((coords) => {
      setUserCoords({ lat: coords.lat, lng: coords.lng });
      setLoading(false);
    });
  }, []);

  const geoScans = scans.filter((s) => s.lat && s.lng);
  const zoneCount = countUniqueZones(scans);
  const totalCO2 = scans.reduce((sum, s) => sum + (s.co2_saved_kg ?? 0), 0);
  const catCount = countCategories(scans);

  const milestones = [
    { target: 3, label: 'Explorer' },
    { target: 10, label: 'Pathfinder' },
    { target: 25, label: 'Territory Master' },
    { target: 50, label: 'City Guardian' },
  ];
  const currentMilestone = milestones.filter((m) => zoneCount >= m.target).pop();
  const nextMilestone = milestones.find((m) => zoneCount < m.target);
  const progress = nextMilestone
    ? Math.min((zoneCount / nextMilestone.target) * 100, 100)
    : 100;

  return (
    <div className="flex flex-col flex-1 page-enter" style={{ background: 'var(--bg-deep)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <button onClick={() => router.back()}
          className="glass-card w-9 h-9 flex items-center justify-center rounded-full"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Go back">
          <ArrowLeft size={17} />
        </button>
        <span className="font-black text-base" style={{ color: 'var(--text-primary)' }}>
          EcoZone
        </span>
        <div className="w-9" />
      </div>

      {/* Subtitle */}
      <p className="text-center text-xs italic mb-3" style={{ color: 'var(--text-muted)' }}>
        Claim your green territory — one scan at a time
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 px-4 mb-3">
        {[
          { icon: <Target size={14} />, value: zoneCount, label: 'Zones', color: '#10B981' },
          { icon: <Zap size={14} />, value: geoScans.length, label: 'Geo Scans', color: '#34D399' },
          { icon: <Leaf size={14} />, value: `${totalCO2.toFixed(1)}kg`, label: 'CO₂ Saved', color: '#4ADE80' },
        ].map(({ icon, value, label, color }) => (
          <div key={label} className="glass-card glass-shine rounded-xl p-2.5 text-center">
            <span style={{ color }}>{icon}</span>
            <p className="font-black text-lg tabular-nums leading-tight mt-0.5" style={{ color }}>{value}</p>
            <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Milestone progress */}
      <div className="glass-card glass-shine mx-4 mb-3 px-4 py-3 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TreePine size={14} style={{ color: '#10B981' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              {currentMilestone ? currentMilestone.label : 'Beginner'}
            </span>
          </div>
          {nextMilestone && (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {zoneCount}/{nextMilestone.target} zones to <span className="font-bold" style={{ color: '#34D399' }}>{nextMilestone.label}</span>
            </span>
          )}
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(16,185,129,0.1)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #059669, #34D399)' }}
          />
        </div>
      </div>

      {/* Map */}
      <div className="mx-4 flex-1 min-h-[50vh] rounded-2xl overflow-hidden mb-4"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        {loading || scansLoading || !userCoords ? (
          <div className="h-full w-full shimmer-load rounded-2xl" />
        ) : geoScans.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8 gap-3"
            style={{ background: 'rgba(8,18,8,0.5)' }}>
            <MapPin size={40} style={{ color: 'var(--text-muted)' }} />
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              No geo-tagged scans yet
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Scan waste from different locations to start building your green territory!
            </p>
            <button onClick={() => router.push('/')}
              className="mt-2 font-bold text-sm px-5 py-2.5 rounded-2xl glass-button-primary"
              style={{ background: 'linear-gradient(135deg,#059669,#10B981)', color: '#060A06' }}>
              Start Scanning
            </button>
          </div>
        ) : (
          <EcoZoneMap scans={geoScans} userLat={userCoords.lat} userLng={userCoords.lng} />
        )}
      </div>

      {/* Category coverage */}
      <div className="px-4 mb-4">
        <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Category coverage: <span className="font-bold" style={{ color: '#34D399' }}>{catCount}/4</span>
        </p>
        <div className="flex gap-2">
          {(['dry', 'wet', 'hazardous', 'ewaste'] as const).map((cat) => {
            const hasCat = scans.some((s) => s.category?.toLowerCase() === cat);
            const cfg = { dry: { emoji: '📦', color: '#3B82F6' }, wet: { emoji: '🥬', color: '#22C55E' }, hazardous: { emoji: '⚠️', color: '#EF4444' }, ewaste: { emoji: '💻', color: '#F97316' } }[cat];
            return (
              <div key={cat}
                className="flex-1 rounded-lg py-1.5 text-center text-sm transition-all"
                style={{
                  background: hasCat ? `${cfg.color}20` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${hasCat ? `${cfg.color}44` : 'rgba(255,255,255,0.06)'}`,
                  opacity: hasCat ? 1 : 0.35,
                }}>
                {cfg.emoji}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
