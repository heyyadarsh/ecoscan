'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, MapPin, Clock, List, Map } from 'lucide-react';
import { motion } from 'framer-motion';
import { CATEGORY_CONFIG } from '@/constants/wasteConfig';
import {
  getCurrentLocation,
  getCityName,
  generateNearbyLocations,
  getDistance,
  formatDistance,
} from '@/lib/location';
import type { DisposalLocation, WasteCategory } from '@/types';

// ─── Dynamic import (Leaflet requires browser) ────────────────────────────────

const WasteMap = dynamic(() => import('@/components/map/WasteMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#141414] shimmer-load rounded-2xl" />,
});

// ─── Category filter config ───────────────────────────────────────────────────

const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG) as WasteCategory[];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [cityName, setCityName] = useState('');
  const [locations, setLocations] = useState<DisposalLocation[]>([]);
  const [activeCategory, setActiveCategory] = useState<WasteCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [loading, setLoading] = useState(true);
  const [isDefaultLocation, setIsDefaultLocation] = useState(false);

  // ─── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const coords = await getCurrentLocation();
      // Detect if we fell back to Gwalior default
      if (coords.lat === 26.2183 && coords.lng === 78.1828) {
        setIsDefaultLocation(true);
      }
      setUserCoords({ lat: coords.lat, lng: coords.lng });

      const city = await getCityName(coords.lat, coords.lng);
      setCityName(city);

      const nearby = generateNearbyLocations(coords.lat, coords.lng, city);
      setLocations(nearby);

      // Honour ?category= URL param
      const urlCat = searchParams.get('category') as WasteCategory | null;
      if (urlCat && ALL_CATEGORIES.includes(urlCat)) {
        setActiveCategory(urlCat);
      }

      setLoading(false);
    }

    init();
  }, [searchParams]);

  // ─── Filtered locations ────────────────────────────────────────────────────
  const filtered =
    activeCategory === 'all'
      ? locations
      : locations.filter((loc) => loc.category.includes(activeCategory as WasteCategory));

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>

        <span className="text-white font-semibold text-base">Disposal Map</span>

        <div className="flex items-center gap-1.5 text-gray-400 text-sm">
          <MapPin size={13} className="text-emerald-400 shrink-0" />
          <span className="truncate max-w-[90px]">
            {loading ? 'Detecting…' : cityName || 'India'}
          </span>
        </div>
      </div>

      {/* Default location notice */}
      {!loading && isDefaultLocation && (
        <div className="mx-4 mb-2 flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
          <MapPin size={14} className="text-blue-400 shrink-0" />
          <p className="text-blue-300 text-xs">
            Using default location — Gwalior. Enable GPS for accurate results.
          </p>
        </div>
      )}

      {/* ── Category Filter Strip ───────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {/* All button */}
          <button
            onClick={() => setActiveCategory('all')}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeCategory === 'all'
                ? 'bg-emerald-500 text-black'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            All
          </button>

          {ALL_CATEGORIES.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors"
                style={
                  isActive
                    ? { backgroundColor: cfg.color, color: '#000' }
                    : { backgroundColor: 'rgba(255,255,255,0.05)', color: '#9CA3AF' }
                }
              >
                {cfg.emoji} {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── View Toggle ────────────────────────────────────────────────────────── */}
      <div className="flex items-center mx-4 mb-3 bg-white/5 rounded-xl p-1 gap-1">
        <button
          onClick={() => setViewMode('map')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'map' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Map size={14} />
          Map View
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <List size={14} />
          List View
        </button>
      </div>

      {/* ── Results count ───────────────────────────────────────────────────── */}
      <p className="text-gray-500 text-xs px-4 mb-2">
        {loading
          ? 'Finding locations…'
          : `Showing ${filtered.length} location${filtered.length !== 1 ? 's' : ''} near ${cityName || 'you'}`}
      </p>

      {/* ── Map View ────────────────────────────────────────────────────────── */}
      {viewMode === 'map' && (
        <div className="mx-4 h-[55vh] rounded-2xl overflow-hidden border border-white/10">
          {loading || !userCoords ? (
            <div className="h-full w-full shimmer-load rounded-2xl" />
          ) : (
            <WasteMap
              locations={locations}
              userLat={userCoords.lat}
              userLng={userCoords.lng}
              activeCategory={activeCategory}
            />
          )}
        </div>
      )}

      {/* ── List View ───────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="flex flex-col gap-3 mx-4 overflow-y-auto">
          {loading ? (
            // Skeleton cards
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shimmer-load h-24 rounded-xl" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MapPin size={32} className="text-gray-600 mb-3" />
              <p className="text-gray-400 font-medium">No locations for this category</p>
              <p className="text-gray-600 text-sm mt-1">Try selecting a different filter</p>
            </div>
          ) : (
            filtered.map((loc, idx) => {
              const primaryCat = (loc.category[0] ?? 'dry') as WasteCategory;
              const cfg = CATEGORY_CONFIG[primaryCat] ?? CATEGORY_CONFIG['dry'];
              const distKm = userCoords
                ? getDistance(userCoords.lat, userCoords.lng, loc.lat, loc.lng)
                : null;

              return (
                <motion.div
                  key={loc.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.05 }}
                  className="bg-[#141414] rounded-xl p-4 border border-white/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-white font-semibold text-sm leading-tight">{loc.name}</p>

                    {/* Distance badge */}
                    {distKm !== null && (
                      <span
                        className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
                      >
                        {formatDistance(distKm)}
                      </span>
                    )}
                  </div>

                  {/* Category badges */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {loc.category.map((cat) => {
                      const c = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG['dry'];
                      return (
                        <span
                          key={cat}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${c.color}18`,
                            color: c.color,
                            border: `1px solid ${c.color}33`,
                          }}
                        >
                          {c.emoji} {c.label}
                        </span>
                      );
                    })}
                  </div>

                  {/* Address */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <MapPin size={11} className="text-gray-500 shrink-0" />
                    <p className="text-gray-500 text-xs">{loc.address}</p>
                  </div>

                  {/* Timing */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock size={11} className="text-gray-500 shrink-0" />
                    <p className="text-gray-500 text-xs">{loc.timing}</p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
