'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Share2, Leaf, TreePine, Zap, Camera } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useScanHistory } from '@/hooks/useScanHistory';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safe = (val: any) => (isNaN(Number(val)) || val == null ? 0 : Number(val));

export default function CertificatePage() {
  const router = useRouter();
  const { user, userId } = useUser();
  const { scans } = useScanHistory(userId);
  const cardRef = useRef<HTMLDivElement>(null);

  const totalCO2 = scans.reduce((sum, s) => sum + (s.co2_saved_kg ?? 0), 0);
  const treesEquiv = (totalCO2 / 22).toFixed(3);
  const scanCount = safe(user?.scanCount);
  const points = safe(user?.totalPoints);
  const name = user?.name || 'EcoWarrior';
  const city = user?.city || 'India';
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const milestones = [
    { threshold: 0.5, title: 'Eco Starter', color: '#34D399' },
    { threshold: 1.0, title: 'Green Guardian', color: '#10B981' },
    { threshold: 2.5, title: 'Carbon Champion', color: '#059669' },
    { threshold: 5.0, title: 'Planet Defender', color: '#047857' },
    { threshold: 10.0, title: 'Earth Hero', color: '#065F46' },
  ];
  const earned = milestones.filter((m) => totalCO2 >= m.threshold);
  const current = earned.length > 0 ? earned[earned.length - 1] : null;
  const nextMilestone = milestones.find((m) => totalCO2 < m.threshold);

  async function handleShare() {
    const shareData = {
      title: 'EcoScan Carbon Certificate',
      text: `${name} saved ${totalCO2.toFixed(2)}kg CO₂ (${treesEquiv} trees worth) through waste segregation on EcoScan! 🌍♻️`,
      url: window.location.origin,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.text + '\n' + shareData.url);
        alert('Copied to clipboard!');
      } catch { /* silent */ }
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto pb-8 page-enter" style={{ background: 'var(--bg-deep)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <button onClick={() => router.back()}
          className="glass-card w-9 h-9 flex items-center justify-center rounded-full"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Go back">
          <ArrowLeft size={17} />
        </button>
        <span className="font-black text-base" style={{ color: 'var(--text-primary)' }}>
          Carbon Certificate
        </span>
        <div className="w-9" />
      </div>

      {/* Certificate Card */}
      <motion.div
        ref={cardRef}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring', bounce: 0.25 }}
        className="mx-4 rounded-3xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(160deg, #0D2818 0%, #0A1F14 40%, #061A0D 100%)',
          border: '1.5px solid rgba(16,185,129,0.25)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5), 0 0 80px rgba(16,185,129,0.06), inset 0 1px 0 rgba(16,185,129,0.15)',
        }}
      >
        {/* Decorative corner circles */}
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 70%)' }} />

        <div className="relative z-10 px-6 py-8 flex flex-col items-center text-center">

          {/* Top badge */}
          <div className="flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Leaf size={12} style={{ color: '#10B981' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#34D399' }}>
              Carbon Offset Certificate
            </span>
          </div>

          {/* Title */}
          {current ? (
            <motion.div
              initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}>
              <p className="text-4xl mb-2">🏅</p>
              <h2 className="font-black text-xl tracking-tight" style={{ color: current.color }}>
                {current.title}
              </h2>
            </motion.div>
          ) : (
            <div>
              <p className="text-4xl mb-2">🌱</p>
              <h2 className="font-black text-xl tracking-tight" style={{ color: '#34D399' }}>
                Getting Started
              </h2>
            </div>
          )}

          {/* Name */}
          <p className="text-lg font-bold mt-4" style={{ color: 'var(--text-primary)' }}>{name}</p>
          <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{city}</p>

          {/* Divider */}
          <div className="w-24 h-px my-5" style={{ background: 'rgba(16,185,129,0.2)' }} />

          {/* CO2 stat - the hero number */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-4"
          >
            <p className="font-black tabular-nums leading-none"
              style={{ fontSize: 56, color: '#34D399', textShadow: '0 0 40px rgba(16,185,129,0.3)' }}>
              {totalCO2.toFixed(2)}
            </p>
            <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>
              kg CO₂ Saved
            </p>
          </motion.div>

          {/* Secondary stats */}
          <div className="grid grid-cols-3 gap-3 w-full mt-2">
            {[
              { icon: <TreePine size={14} />, value: treesEquiv, label: 'Trees Worth', color: '#4ADE80' },
              { icon: <Camera size={14} />, value: scanCount, label: 'Scans', color: '#60A5FA' },
              { icon: <Zap size={14} />, value: points, label: 'EcoPoints', color: '#FBBF24' },
            ].map(({ icon, value, label, color }) => (
              <div key={label} className="rounded-xl py-2.5 text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color }}>{icon}</span>
                <p className="font-black text-base tabular-nums leading-tight mt-1" style={{ color }}>{value}</p>
                <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Date & watermark */}
          <div className="mt-6 flex flex-col items-center gap-1">
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Issued on {dateStr}</p>
            <p className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(16,185,129,0.3)' }}>ECOSCAN</p>
          </div>
        </div>
      </motion.div>

      {/* Next milestone */}
      {nextMilestone && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card glass-shine mx-4 mt-4 px-4 py-3 rounded-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Next: {nextMilestone.title}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {totalCO2.toFixed(2)} / {nextMilestone.threshold}kg
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min((totalCO2 / nextMilestone.threshold) * 100, 100)}%`,
                background: `linear-gradient(90deg, ${nextMilestone.color}, #34D399)`,
              }} />
          </div>
        </motion.div>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mx-4 mt-4 flex gap-3"
      >
        <button onClick={handleShare}
          className="flex-1 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 glass-button-primary"
          style={{ background: 'linear-gradient(135deg,#059669,#10B981)', color: '#060A06' }}>
          <Share2 size={15} /> Share
        </button>
        <button onClick={() => router.push('/')}
          className="glass-card py-3.5 px-5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{ color: 'var(--text-muted)' }}>
          <Download size={15} /> Scan More
        </button>
      </motion.div>
    </div>
  );
}
