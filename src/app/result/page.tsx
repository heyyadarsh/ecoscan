'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  MapPin,
  CheckCircle,
  Lightbulb,
  Leaf,
  Star,
} from 'lucide-react';
import { CATEGORY_CONFIG } from '@/constants/wasteConfig';
import { speak, stopSpeaking, buildSpeechText } from '@/lib/voice';
import type { ClassificationResult } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut', delay },
});

// ─── Component ───────────────────────────────────────────────────────────────

export default function ResultPage() {
  const router = useRouter();

  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'en' | 'hi'>('hi');
  const [mounted, setMounted] = useState(false);

  // ─── Load from sessionStorage ──────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const raw = sessionStorage.getItem('lastScanResult');
    const img = sessionStorage.getItem('lastScanImage');

    if (!raw) {
      router.replace('/');
      return;
    }

    try {
      setResult(JSON.parse(raw) as ClassificationResult);
      setImage(img);
    } catch {
      router.replace('/');
    }
  }, [router]);

  // ─── Auto-play voice on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!result) return;

    const timer = setTimeout(() => {
      speak(buildSpeechText(result, 'hi'), 'hi-IN');
      setIsPlaying(true);

      // Poll speechSynthesis.speaking to detect when playback ends
      const poll = setInterval(() => {
        if (typeof window !== 'undefined' && !window.speechSynthesis.speaking) {
          setIsPlaying(false);
          clearInterval(poll);
        }
      }, 500);

      return () => clearInterval(poll);
    }, 600);

    return () => clearTimeout(timer);
  }, [result]);

  // ─── Cleanup speech on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  // ─── Voice toggle ─────────────────────────────────────────────────────────
  function toggleVoice() {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
    } else if (result) {
      speak(buildSpeechText(result, voiceLang), voiceLang === 'hi' ? 'hi-IN' : 'en-IN');
      setIsPlaying(true);

      const poll = setInterval(() => {
        if (typeof window !== 'undefined' && !window.speechSynthesis.speaking) {
          setIsPlaying(false);
          clearInterval(poll);
        }
      }, 500);
    }
  }

  // ─── Lang switch ──────────────────────────────────────────────────────────
  function switchLang(lang: 'en' | 'hi') {
    if (lang === voiceLang) return;
    stopSpeaking();
    setIsPlaying(false);
    setVoiceLang(lang);
  }

  // ─── Guard ────────────────────────────────────────────────────────────────
  if (!mounted || !result) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center">
        <div className="shimmer-load w-40 h-8 mb-4" />
        <div className="shimmer-load w-64 h-4" />
      </div>
    );
  }

  const cfg = CATEGORY_CONFIG[result.category];

  return (
    <div className="flex flex-col flex-1 relative overflow-y-auto pb-8">
      {/* Category colour wash at top */}
      <div
        className="absolute inset-x-0 top-0 h-64 pointer-events-none z-0"
        style={{
          background: `linear-gradient(180deg, ${cfg.color}0D 0%, transparent 100%)`,
        }}
      />

      {/* ── Section 1: Top Bar ──────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-6 pb-2">
        <button
          onClick={() => router.push('/')}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>

        <span className="text-white font-semibold text-base">Scan Result</span>

        <div className="flex flex-col items-end gap-1.5">
          <button
            onClick={toggleVoice}
            className={`w-9 h-9 flex items-center justify-center rounded-full border transition-colors ${
              isPlaying
                ? `border-transparent text-black`
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
            }`}
            style={isPlaying ? { backgroundColor: cfg.color } : undefined}
            aria-label="Toggle voice"
          >
            {isPlaying ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Lang toggle */}
          <div className="flex items-center gap-1 bg-white/5 rounded-full px-1.5 py-0.5 border border-white/10">
            {(['en', 'hi'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => switchLang(lang)}
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full transition-colors ${
                  voiceLang === lang
                    ? 'bg-white/15 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {lang === 'en' ? 'EN' : 'हिं'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 2: Image Preview ─────────────────────────────────────────── */}
      <AnimatePresence>
        {image && (
          <motion.div
            key="image"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="relative z-10 flex justify-center mt-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt={result.item_name}
              className="w-24 h-24 rounded-full object-cover border-2"
              style={{ borderColor: cfg.color }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Section 3: Category Badge ─────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 flex flex-col items-center px-4 mt-5 gap-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.1 }}
      >
        {/* Hero badge */}
        <div
          className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${cfg.bgClass} ${cfg.borderClass}`}
        >
          <span className="text-3xl">{cfg.emoji}</span>
          <div className="flex flex-col">
            <span className={`text-xl font-bold ${cfg.textClass}`}>{cfg.label}</span>
            <span
              className="text-xs font-semibold mt-0.5 px-2 py-0.5 rounded-full self-start"
              style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
            >
              {result.confidence}% confident
            </span>
          </div>
        </div>

        {/* Item name */}
        <h1 className="text-2xl font-bold text-white text-center">{result.item_name}</h1>

        {/* Subcategory */}
        <p className="text-gray-500 text-sm">{result.subcategory}</p>
      </motion.div>

      {/* ── Section 4: Stats Row ──────────────────────────────────────────────── */}
      <div className="relative z-10 grid grid-cols-3 gap-2 mx-4 mt-5">
        {[
          {
            icon: <Star size={16} className={cfg.textClass} />,
            value: `+${result.points_earned}`,
            valueClass: cfg.textClass,
            label: 'EcoPoints',
            delay: 0.2,
          },
          {
            icon: <Leaf size={16} className="text-emerald-400" />,
            value: `${result.co2_saved_kg}kg`,
            valueClass: 'text-emerald-400',
            label: 'CO₂ Saved',
            delay: 0.3,
          },
          {
            icon: (
              <CheckCircle
                size={16}
                className={result.recyclable ? 'text-green-400' : 'text-gray-500'}
              />
            ),
            value: result.recyclable ? 'Yes' : 'No',
            valueClass: result.recyclable ? 'text-green-400' : 'text-gray-500',
            label: 'Recyclable',
            delay: 0.4,
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            {...fadeUp(stat.delay)}
            className="bg-[#141414] rounded-xl p-3 flex flex-col items-center text-center border border-white/5"
          >
            <div className="mb-1">{stat.icon}</div>
            <span className={`text-lg font-bold leading-tight ${stat.valueClass}`}>
              {stat.value}
            </span>
            <span className="text-gray-500 text-[10px] mt-0.5">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* ── Section 5: Disposal Steps ─────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.35)} className="relative z-10 mx-4 mt-6">
        <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
          <span>{cfg.emoji}</span> How to Dispose
        </h2>

        <div className="flex flex-col gap-2">
          {result.disposal_steps.map((step, i) => (
            <motion.div
              key={i}
              {...fadeUp(0.4 + i * 0.1)}
              className={`flex items-start gap-3 bg-[#141414] rounded-xl p-4 border-l-2 ${cfg.borderClass}`}
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 text-black"
                style={{ backgroundColor: cfg.color }}
              >
                {i + 1}
              </span>
              <p className="text-gray-300 text-sm leading-relaxed">{step}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Section 6: Fun Fact ───────────────────────────────────────────────── */}
      <motion.div
        {...fadeUp(0.65)}
        className="relative z-10 mx-4 mt-4 bg-amber-500/5 border border-amber-500/10 rounded-xl p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb size={16} className="text-amber-400" />
          <span className="text-amber-400 font-semibold text-sm">Did you know?</span>
        </div>
        <p className="text-gray-400 text-sm italic leading-relaxed">{result.fun_fact}</p>
      </motion.div>

      {/* ── Section 7: Hindi Instruction ─────────────────────────────────────── */}
      <motion.div
        {...fadeUp(0.75)}
        className="relative z-10 mx-4 mt-4 bg-[#141414] rounded-xl p-4"
      >
        <span className="text-gray-500 text-xs mb-2 block">🇮🇳 Hindi Instructions</span>
        <p className="text-gray-200 text-base leading-relaxed">{result.hindi_instruction}</p>
      </motion.div>

      {/* ── Section 8: Action Buttons ─────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.85)} className="relative z-10 mx-4 mt-6 flex flex-col gap-3">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push(`/map?category=${result.category}`)}
          className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 text-black"
          style={{
            background: `linear-gradient(135deg, ${cfg.color}dd, ${cfg.color})`,
          }}
        >
          <MapPin size={18} />
          Find Disposal Point
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            sessionStorage.clear();
            router.push('/');
          }}
          className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium flex items-center justify-center gap-2"
        >
          <RotateCcw size={16} />
          Scan Another
        </motion.button>
      </motion.div>
    </div>
  );
}
