'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, RotateCcw, MapPin, CheckCircle, Lightbulb, Leaf, Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { CATEGORY_CONFIG } from '@/constants/wasteConfig';
import { speak, stopSpeaking, buildSpeechText } from '@/lib/voice';
import { submitFeedback } from '@/lib/feedback';
import { useUser } from '@/hooks/useUser';
import type { ClassificationResult, WasteCategory } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay },
});

const VALID_CATEGORIES = ['dry', 'wet', 'hazardous', 'ewaste'] as const;
const FALLBACK_HINDI = 'koodedaan mein daalen';

// ─── Component ───────────────────────────────────────────────────────────────
export default function ResultPage() {
  const router = useRouter();
  const { userId } = useUser();
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'en' | 'hi'>('hi');
  const [ready, setReady] = useState(false);

  // ── Feedback state ────────────────────────────────────────────────────────
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [selectedCorrectCategory, setSelectedCorrectCategory] = useState<WasteCategory | null>(null);
  const [showCorrectionPicker, setShowCorrectionPicker] = useState(false);

  // ── Load from sessionStorage ──────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      const raw = sessionStorage.getItem('lastScanResult');
      const img = sessionStorage.getItem('lastScanImage');
      if (!raw) { router.replace('/'); return; }
      try {
        const parsed = JSON.parse(raw) as ClassificationResult;
        console.log('[EcoScan] Result loaded:', parsed);
        const normalizedCat = parsed.category?.toLowerCase?.();
        const isCategoryValid = VALID_CATEGORIES.includes(normalizedCat as (typeof VALID_CATEGORIES)[number]);
        if (!parsed.item_name || !isCategoryValid) { router.replace('/'); return; }
        setResult(parsed); setImage(img); setReady(true);
      } catch { router.replace('/'); }
    }, 500);
    return () => clearTimeout(timer);
  }, [router]);

  // ── Auto-play voice ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!result) return;
    const hindiRaw = result.hindi_instruction ?? '';
    if (!hindiRaw.trim() || hindiRaw.trim() === FALLBACK_HINDI) return;
    const t = setTimeout(() => {
      speak(buildSpeechText(result, 'hi'), 'hi-IN'); setIsPlaying(true);
      const poll = setInterval(() => {
        if (typeof window !== 'undefined' && !window.speechSynthesis.speaking) { setIsPlaying(false); clearInterval(poll); }
      }, 500);
      return () => clearInterval(poll);
    }, 600);
    return () => clearTimeout(t);
  }, [result]);

  useEffect(() => () => stopSpeaking(), []);

  function toggleVoice() {
    if (isPlaying) { stopSpeaking(); setIsPlaying(false); }
    else if (result) {
      speak(buildSpeechText(result, voiceLang), voiceLang === 'hi' ? 'hi-IN' : 'en-IN'); setIsPlaying(true);
      const poll = setInterval(() => {
        if (typeof window !== 'undefined' && !window.speechSynthesis.speaking) { setIsPlaying(false); clearInterval(poll); }
      }, 500);
    }
  }

  function switchLang(lang: 'en' | 'hi') {
    if (lang === voiceLang) return;
    stopSpeaking(); setIsPlaying(false); setVoiceLang(lang);
  }

  // ── Feedback handler ─────────────────────────────────────────────────────
  async function handleFeedback(
    type: 'correct' | 'incorrect',
    corrected: WasteCategory | null
  ) {
    if (!result || feedbackGiven) return;
    setFeedbackSubmitting(true);
    await submitFeedback(
      userId || 'anonymous',
      result.item_name,
      result.category,
      type,
      corrected
    );
    setFeedbackSubmitting(false);
    setFeedbackGiven(true);
    setShowCorrectionPicker(false);
  }

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!ready || !result) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4"
        style={{ background: 'var(--bg-deep)' }}>
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#10B981', borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading result…</p>
      </div>
    );
  }

  const normalizedCategory = result.category?.toLowerCase?.() as keyof typeof CATEGORY_CONFIG;
  const cfg = CATEGORY_CONFIG[normalizedCategory] ?? CATEGORY_CONFIG['dry'];

  const disposalSteps: string[] = Array.isArray(result.disposal_steps) && result.disposal_steps.length
    ? result.disposal_steps
    : ['Identify the item', 'Separate from other waste', 'Place in the appropriate bin'];
  const funFact      = result.fun_fact || 'Proper waste segregation can reduce landfill waste by up to 70%.';
  const hindiInstruction = result.hindi_instruction || 'इस वस्तु को उचित रंग के डब्बे में डालें।';
  const itemName     = result.item_name || 'Unknown Item';
  const subcategory  = result.subcategory || cfg.label;
  const confidence   = result.confidence ?? 60;
  const pointsEarned = result.points_earned ?? cfg.points;
  const co2Saved     = result.co2_saved_kg ?? 0.05;

  return (
    <div className="flex flex-col flex-1 relative overflow-y-auto pb-8"
      style={{ background: 'var(--bg-deep)' }}>

      {/* Category-colored radial blob at top */}
      <div className="absolute inset-x-0 top-0 h-72 pointer-events-none z-0"
        style={{ background: `radial-gradient(ellipse at 50% -20%, ${cfg.color}10 0%, transparent 70%)` }} />

      {/* ── Top bar ────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-6 pb-2">
        <button onClick={() => router.push('/')}
          className="glass-card w-9 h-9 flex items-center justify-center rounded-full transition-colors"
          style={{ color: 'var(--text-muted)' }} aria-label="Go back">
          <ArrowLeft size={17} />
        </button>

        <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Scan Result</span>

        <div className="flex flex-col items-end gap-1.5">
          <button onClick={toggleVoice}
            className="glass-card w-9 h-9 flex items-center justify-center rounded-full transition-colors"
            style={isPlaying ? { background: cfg.color, color: '#060A06' } : { color: 'var(--text-muted)' }}
            aria-label="Toggle voice">
            {isPlaying ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <div className="glass-card flex items-center gap-0.5 rounded-full px-1.5 py-0.5">
            {(['en', 'hi'] as const).map((lang) => (
              <button key={lang} onClick={() => switchLang(lang)}
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-colors"
                style={voiceLang === lang ? { background: 'rgba(16,185,129,0.2)', color: '#34D399' } : { color: 'var(--text-muted)' }}>
                {lang === 'en' ? 'EN' : 'हिं'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Image preview ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {image && (
          <motion.div key="img" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }} className="relative z-10 flex justify-center mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={itemName} className="w-24 h-24 rounded-full object-cover"
              style={{ border: `2px solid ${cfg.color}` }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Category badge + item name ────────────────────────────────────────── */}
      <motion.div className="relative z-10 flex flex-col items-center px-4 mt-5 gap-3"
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}>

        <div className="glass-card flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{ borderColor: `${cfg.color}33` }}>
          <span className="text-3xl">{cfg.emoji}</span>
          <div className="flex flex-col">
            <span className="text-xl font-black" style={{ color: cfg.color }}>{cfg.label}</span>
            <span className="text-xs font-semibold mt-0.5 px-2 py-0.5 rounded-full self-start"
              style={{ background: `${cfg.color}20`, color: cfg.color }}>
              {confidence}% confident
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-black text-center" style={{ color: 'var(--text-primary)' }}>{itemName}</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{subcategory}</p>
      </motion.div>

      {/* ── Stats row ────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 grid grid-cols-3 gap-2 mx-4 mt-5">
        {[
          { icon: <Star size={15} />, value: `+${pointsEarned}`, label: 'EcoPoints', color: cfg.color, delay: 0.2 },
          { icon: <Leaf size={15} />, value: `${co2Saved}kg`, label: 'CO₂ Saved', color: '#34D399', delay: 0.3 },
          {
            icon: <CheckCircle size={15} />,
            value: result.recyclable ? 'Yes' : 'No',
            label: 'Recyclable',
            color: result.recyclable ? '#4ADE80' : 'var(--text-muted)',
            delay: 0.4,
          },
        ].map((stat) => (
          <motion.div key={stat.label} {...fadeUp(stat.delay)}
            className="glass-card rounded-2xl p-3 flex flex-col items-center text-center"
            style={{ borderColor: `${stat.color}22` }}>
            <span style={{ color: stat.color }} className="mb-1">{stat.icon}</span>
            <span className="text-lg font-black leading-tight tabular-nums" style={{ color: stat.color }}>{stat.value}</span>
            <span className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* ── Disposal steps ───────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.35)} className="relative z-10 mx-4 mt-6">
        <h2 className="font-bold text-base mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span>{cfg.emoji}</span> How to Dispose
        </h2>
        <div className="flex flex-col gap-2">
          {disposalSteps.map((step, i) => (
            <motion.div key={i} {...fadeUp(0.4 + i * 0.08)}
              className="glass-card flex items-start gap-3 rounded-2xl p-4"
              style={{ borderLeft: `3px solid ${cfg.color}`, borderRadius: '16px' }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                style={{ background: cfg.color, color: '#060A06' }}>
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{step}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Fun fact ─────────────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.65)} className="relative z-10 glass-card mx-4 mt-4 p-4 rounded-2xl"
        style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.04)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb size={15} style={{ color: '#F59E0B' }} />
          <span className="font-bold text-sm" style={{ color: '#F59E0B' }}>Did you know?</span>
        </div>
        <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-muted)' }}>{funFact}</p>
      </motion.div>

      {/* ── Hindi instruction ────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.75)} className="relative z-10 glass-card mx-4 mt-4 p-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <span>🇮🇳</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Hindi Instructions</span>
        </div>
        <p className="text-base leading-relaxed" style={{ color: 'var(--text-primary)' }}>{hindiInstruction}</p>
      </motion.div>

      {/* ── Feedback ─────────────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.82)} className="relative z-10 glass-card mx-4 mt-4 p-4 rounded-2xl">
        {feedbackGiven ? (
          /* ── Confirmation ── */
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center py-1 gap-1.5"
          >
            <CheckCircle size={22} style={{ color: '#10B981' }} />
            <p className="font-bold text-sm" style={{ color: '#34D399' }}>
              Thanks for the feedback! 🌱
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Your correction helps improve AI accuracy for everyone
            </p>
          </motion.div>
        ) : (
          /* ── Prompt ── */
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ThumbsUp size={14} style={{ color: 'var(--text-muted)' }} />
                <ThumbsDown size={14} style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Was this correct?
                </span>
              </div>
            </div>

            {!showCorrectionPicker ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleFeedback('correct', null)}
                  disabled={feedbackSubmitting}
                  className="flex-1 rounded-xl px-4 py-2 text-sm font-medium border transition-colors disabled:opacity-50"
                  style={{
                    background: 'rgba(16,185,129,0.1)',
                    borderColor: 'rgba(16,185,129,0.2)',
                    color: '#34D399',
                  }}
                >
                  ✓ Correct
                </button>
                <button
                  onClick={() => setShowCorrectionPicker(true)}
                  disabled={feedbackSubmitting}
                  className="flex-1 rounded-xl px-4 py-2 text-sm font-medium border transition-colors disabled:opacity-50"
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    borderColor: 'rgba(239,68,68,0.2)',
                    color: '#F87171',
                  }}
                >
                  ✗ Wrong Category
                </button>
              </div>
            ) : null}

            {/* Correction picker */}
            <AnimatePresence>
              {showCorrectionPicker && (
                <motion.div
                  key="picker"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                    What should it be?
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {(Object.keys(CATEGORY_CONFIG) as WasteCategory[]).map((cat) => {
                      const c = CATEGORY_CONFIG[cat];
                      const isSelected = selectedCorrectCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCorrectCategory(cat)}
                          className={`rounded-xl px-3 py-2.5 text-sm font-medium border flex items-center gap-2 transition-all ${c.bgClass} ${c.borderClass} ${c.textClass}`}
                          style={isSelected ? { outline: `2px solid ${c.color}`, outlineOffset: 2 } : {}}
                        >
                          <span>{c.emoji}</span>
                          <span className="truncate">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handleFeedback('incorrect', selectedCorrectCategory)}
                    disabled={!selectedCorrectCategory || feedbackSubmitting}
                    className="w-full py-2 rounded-xl text-sm border flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {feedbackSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border border-t-transparent animate-spin"
                          style={{ borderColor: '#34D399', borderTopColor: 'transparent' }} />
                        Submitting…
                      </>
                    ) : 'Submit Correction'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>

      {/* ── Action buttons ───────────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.85)} className="relative z-10 mx-4 mt-6 flex flex-col gap-3">
        <motion.button whileTap={{ scale: 0.98 }}
          onClick={() => router.push(`/map?category=${result.category}`)}
          className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 glow-brand"
          style={{ background: `linear-gradient(135deg,${cfg.color}cc,${cfg.color})`, color: '#060A06' }}>
          <MapPin size={17} /> Find Disposal Point
        </motion.button>

        <motion.button whileTap={{ scale: 0.98 }}
          onClick={() => { sessionStorage.clear(); router.push('/'); }}
          className="glass-card w-full py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
          style={{ color: 'var(--text-muted)' }}>
          <RotateCcw size={15} /> Scan Another
        </motion.button>
      </motion.div>
    </div>
  );
}
