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

const WasteMap = dynamic(() => import('@/components/map/WasteMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full shimmer-load rounded-2xl" />
  ),
});

const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG) as WasteCategory[];

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

  useEffect(() => {
    async function init() {
      const coords = await getCurrentLocation();
      if (coords.lat === 26.2183 && coords.lng === 78.1828) setIsDefaultLocation(true);
      setUserCoords({ lat: coords.lat, lng: coords.lng });
      const city = await getCityName(coords.lat, coords.lng);
      console.log('[EcoScan] Resolved city name:', city, '| coords:', coords.lat, coords.lng);
      setCityName(city);
      setLocations(generateNearbyLocations(coords.lat, coords.lng, city));
      const urlCat = searchParams.get('category') as WasteCategory | null;
      if (urlCat && ALL_CATEGORIES.includes(urlCat)) setActiveCategory(urlCat);
      setLoading(false);
    }
    init();
  }, [searchParams]);

  const filtered =
    activeCategory === 'all'
      ? locations
      : locations.filter((loc) => loc.category.includes(activeCategory as WasteCategory));

  return (
    <div className="flex flex-col flex-1" style={{ background: 'var(--bg-deep)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <button
          onClick={() => router.back()}
          className="glass-card w-9 h-9 flex items-center justify-center rounded-full transition-colors"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Go back"
        >
          <ArrowLeft size={17} />
        </button>

        <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
          Disposal Map
        </span>

        <div className="flex items-center gap-1.5 text-sm">
          <MapPin size={13} style={{ color: '#10B981' }} className="shrink-0" />
          <span className="truncate max-w-[90px]" style={{ color: 'var(--text-muted)' }}>
            {loading ? 'Detecting…' : cityName || 'India'}
          </span>
        </div>
      </div>

      {/* Default location notice */}
      {!loading && isDefaultLocation && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card mx-4 mb-2 flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ borderColor: 'rgba(59,130,246,0.2)' }}
        >
          <MapPin size={13} className="shrink-0" style={{ color: '#60A5FA' }} />
          <p className="text-xs" style={{ color: 'rgba(147,197,253,0.8)' }}>
            Using default location — Gwalior. Enable GPS for accurate results.
          </p>
        </motion.div>
      )}

      {/* ── Category Filter Strip ─────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setActiveCategory('all')}
            className="shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-all"
            style={
              activeCategory === 'all'
                ? { background: '#10B981', color: '#060A06' }
                : { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.12)', color: 'var(--text-muted)' }
            }
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
                className="shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-all"
                style={
                  isActive
                    ? { backgroundColor: cfg.color, color: '#000' }
                    : { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.12)', color: 'var(--text-muted)' }
                }
              >
                {cfg.emoji} {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── View Toggle ─────────────────────────────────────────────────────── */}
      <div className="glass-card flex items-center mx-4 mb-3 rounded-xl p-1 gap-1">
        {(['map', 'list'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={
              viewMode === mode
                ? { background: '#10B981', color: '#060A06' }
                : { color: 'var(--text-muted)' }
            }
          >
            {mode === 'map' ? <Map size={13} /> : <List size={13} />}
            {mode === 'map' ? 'Map View' : 'List View'}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-xs px-4 mb-2" style={{ color: 'var(--text-muted)' }}>
        {loading
          ? 'Finding locations…'
          : `Showing ${filtered.length} location${filtered.length !== 1 ? 's' : ''} near ${cityName || 'you'}`}
      </p>

      {/* ── Map View ─────────────────────────────────────────────────────────── */}
      {viewMode === 'map' && (
        <div className="mx-4 h-[52vh] rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
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

      {/* ── List View ────────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="flex flex-col mx-4 overflow-y-auto pb-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shimmer-load h-24 rounded-2xl mb-3" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MapPin size={32} className="mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No locations for this category</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Try selecting a different filter</p>
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
                  className="glass-card rounded-2xl p-4 mb-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {loc.name}
                    </p>
                    {distKm !== null && (
                      <span
                        className="shrink-0 text-xs font-bold px-3 py-0.5 rounded-full"
                        style={{ background: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}44` }}
                      >
                        {formatDistance(distKm)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {loc.category.map((cat) => {
                      const c = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG['dry'];
                      return (
                        <span key={cat} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${c.color}18`, color: c.color, border: `1px solid ${c.color}33` }}>
                          {c.emoji} {c.label}
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1.5 mt-2">
                    <MapPin size={10} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{loc.address}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock size={10} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{loc.timing}</p>
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
