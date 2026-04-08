'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Zap, Leaf, Loader2 } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { recordScan } from '@/lib/points';
export default function ScanPage() {
  const router = useRouter();
  const { user, userId, loading } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isScanning, setIsScanning] = useState(false);
  const [showPointsFloat, setShowPointsFloat] = useState(false);
  const [floatingPoints, setFloatingPoints] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // ─── Image Upload ──────────────────────────────────────────────────────────

  const handleFileChange = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setMimeType(file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };
  const onDragLeave = () => setDragActive(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  // ─── Scan Logic ───────────────────────────────────────────────────────────

  const handleScan = async () => {
    if (!selectedImage) return;
    setIsScanning(true);

    try {
      const base64 = selectedImage.split(',')[1];
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType }),
      });
      const result = await res.json();

      sessionStorage.setItem('lastScanResult', JSON.stringify(result));
      sessionStorage.setItem('lastScanImage', selectedImage);

      if (userId) {
        await recordScan(userId, result);
      }

      setFloatingPoints(result.points_earned);
      setShowPointsFloat(true);
      setTimeout(() => setShowPointsFloat(false), 1500);

      setTimeout(() => router.push('/result'), 800);
    } catch (err) {
      console.error('Scan failed:', err);
      setIsScanning(false);
    } finally {
      setIsScanning(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col flex-1 relative"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Floating points animation */}
      <AnimatePresence>
        {showPointsFloat && (
          <motion.div
            key="points-float"
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: -80, opacity: 0 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 z-50 pointer-events-none
                       text-emerald-400 font-bold text-xl"
          >
            +{floatingPoints} pts
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Section 1: Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between py-6 px-4">
        <div className="flex items-center gap-2">
          <Leaf size={20} className="text-emerald-400" />
          <span className="font-bold text-white text-lg">EcoScan</span>
        </div>

        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
          {loading ? (
            <span className="shimmer-load w-16 h-4" />
          ) : (
            <>
              <Zap size={14} className="text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">
                {user?.totalPoints ?? 0} pts
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Section 2: Scanner Area ───────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center py-8 flex-1 relative">
        <div className="relative flex items-center justify-center">
          {/* Pulsing rings — only when idle with no image */}
          {!isScanning && !selectedImage && (
            <>
              <span
                className="scan-ring absolute rounded-full border border-emerald-500/10"
                style={{ width: 260, height: 260 }}
              />
              <span
                className="scan-ring scan-ring-delay-1 absolute rounded-full border border-emerald-500/7"
                style={{ width: 220, height: 220 }}
              />
              <span
                className="scan-ring scan-ring-delay-2 absolute rounded-full border border-emerald-500/4"
                style={{ width: 180, height: 180 }}
              />
            </>
          )}

          {/* Centre circle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center
              overflow-hidden cursor-pointer transition-colors duration-200
              ${dragActive ? 'border-2 border-emerald-400 bg-emerald-500/10' : ''}
              ${!selectedImage ? 'bg-[#1a1a1a] border-2 border-dashed border-emerald-500/40' : ''}`}
            aria-label="Select image to scan"
          >
            {selectedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedImage}
                alt="Selected waste"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <>
                <Camera size={40} className="text-emerald-400" />
                <span className="text-emerald-400/80 text-xs mt-2 font-medium">
                  Tap to scan
                </span>
              </>
            )}
          </motion.button>
        </div>

        <p className="text-gray-600 text-xs mt-5">or drag &amp; drop an image</p>
      </div>

      {/* ── Section 3: Action Buttons ─────────────────────────────────────── */}
      <div className="mx-4 mb-4">
        {/* Primary scan button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleScan}
          disabled={!selectedImage || isScanning}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
            bg-gradient-to-r from-emerald-600 to-emerald-500 text-black glow-brand
            flex items-center justify-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
        >
          {isScanning ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Analyzing…
            </>
          ) : (
            'Scan Waste'
          )}
        </motion.button>

        {/* Secondary upload button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning}
          className="w-full mt-3 py-3 rounded-xl bg-white/5 border border-white/10
            text-gray-300 font-medium flex items-center justify-center gap-2
            disabled:opacity-40 disabled:cursor-not-allowed transition-opacity duration-200"
        >
          <Upload size={18} />
          Choose from Gallery
        </motion.button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onInputChange}
      />

      {/* ── Section 4: Quick Stats Row ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 mx-4 mb-4">
        {[
          { value: '62M Tonnes', label: 'Annual Indian Waste' },
          { value: '20%', label: 'Properly Segregated' },
          { value: '4 Types', label: 'Waste Categories' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-[#141414] rounded-xl p-3 flex flex-col items-center text-center"
          >
            <span className="text-white font-bold text-base leading-tight">
              {stat.value}
            </span>
            <span className="text-gray-500 text-[10px] mt-0.5 leading-tight">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
