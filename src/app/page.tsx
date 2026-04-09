'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Zap, Leaf } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { recordScan } from '@/lib/points';

export default function ScanPage() {
  const router = useRouter();
  const { user, userId, loading } = useUser();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [isScanning, setIsScanning] = useState(false);
  const [showPointsFloat, setShowPointsFloat] = useState(false);
  const [floatingPoints, setFloatingPoints] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastPoints, setToastPoints] = useState(0);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onloadend = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

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
      try { sessionStorage.setItem('lastScanImage', selectedImage); } catch {}

      if (userId) {
        try {
          await recordScan(userId, result);
        } catch (fbErr) {
          console.error('recordScan failed (non-blocking):', fbErr);
        }
      }

      setFloatingPoints(result.points_earned || 10);
      setShowPointsFloat(true);
      setTimeout(() => setShowPointsFloat(false), 1500);

      setToastPoints(result.points_earned || 10);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);

      setTimeout(() => router.push('/result'), 800);
    } catch (err) {
      console.error('Scan failed:', err);
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0A] text-white pb-24" onDragOver={(e) => e.preventDefault()}>
      {/* Toast notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none
              bg-emerald-500 text-black font-bold text-sm px-5 py-2.5 rounded-full
              shadow-lg shadow-emerald-900/40 flex items-center gap-2 whitespace-nowrap"
          >
            <Zap size={14} />
            +{toastPoints} EcoPoints earned!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between py-6 px-4">
        <div className="flex items-center gap-2">
          <Leaf size={20} className="text-emerald-400" />
          <span className="font-bold text-white">EcoScan</span>
        </div>
        {loading ? (
          <div className="shimmer-load w-20 h-8 rounded-full" />
        ) : (
          <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
            <Zap size={14} className="text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">{user?.totalPoints ?? 0} pts</span>
          </div>
        )}
      </div>

      {/* Scanner area */}
      <div className="flex flex-col items-center justify-center py-8 relative">
        {/* Pulsing rings */}
        {!selectedImage && !isScanning && (
          <>
            <div className="absolute w-[180px] h-[180px] rounded-full border border-emerald-500/10 scan-ring" />
            <div className="absolute w-[220px] h-[220px] rounded-full border border-emerald-500/7 scan-ring scan-ring-delay-1" />
            <div className="absolute w-[260px] h-[260px] rounded-full border border-emerald-500/4 scan-ring scan-ring-delay-2" />
          </>
        )}

        <motion.div
          whileTap={{ scale: 0.95 }}
          onClick={() => cameraInputRef.current?.click()}
          className="w-40 h-40 rounded-full flex flex-col items-center justify-center cursor-pointer relative z-10
            bg-[#1a1a1a] border-2 border-dashed border-emerald-500/40 overflow-hidden"
        >
          {selectedImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selectedImage} alt="preview" className="w-full h-full object-cover rounded-full" />
          ) : (
            <>
              <Camera size={40} className="text-emerald-400" />
              <span className="text-xs text-gray-400 mt-2">Tap to scan</span>
            </>
          )}
        </motion.div>
        <p className="text-xs text-gray-600 mt-4">or drag &amp; drop an image</p>
      </div>

      {/* Floating points animation */}
      <AnimatePresence>
        {showPointsFloat && (
          <motion.div
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: -80, opacity: 0 }}
            transition={{ duration: 1.4 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 text-emerald-400 font-bold text-xl z-50 pointer-events-none"
          >
            +{floatingPoints} pts
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buttons */}
      <div className="flex flex-col mx-4 gap-3">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleScan}
          disabled={!selectedImage || isScanning}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-black font-bold text-lg glow-brand
            disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isScanning ? (
            <>
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Analyzing...
            </>
          ) : 'Scan Waste'}
        </motion.button>

        <button
          onClick={() => galleryInputRef.current?.click()}
          className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 flex items-center justify-center gap-2"
        >
          <Upload size={18} />
          Choose from Gallery
        </button>
      </div>

      {/* Hidden inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onInputChange} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mx-4 mt-6">
        {[['62M Tonnes', 'Annual Indian Waste'], ['20%', 'Properly Segregated'], ['4 Types', 'Waste Categories']].map(([val, label]) => (
          <div key={label} className="bg-[#141414] rounded-xl p-3 text-center">
            <p className="font-bold text-white text-sm">{val}</p>
            <p className="text-[10px] text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
