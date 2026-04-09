'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { CATEGORY_CONFIG } from '@/constants/wasteConfig';
import { getDistance, formatDistance } from '@/lib/location';
import type { DisposalLocation, WasteCategory } from '@/types';

// ─── Fix Leaflet default icon (broken by webpack asset hashing) ───────────────
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

// ─── Custom icon factories ────────────────────────────────────────────────────

function createCategoryIcon(category: WasteCategory): L.DivIcon {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG['dry'];
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:36px; height:36px; border-radius:50%;
        background:${cfg.color};
        border:2px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.4);
        display:flex; align-items:center; justify-content:center;
        font-size:16px; line-height:1;
      ">${cfg.emoji}</div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

const userIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width:40px; height:40px; border-radius:50%;
      background:#3B82F6;
      border:3px solid white;
      box-shadow:0 2px 12px rgba(59,130,246,0.5);
      display:flex; align-items:center; justify-content:center;
      color:white; font-size:10px; font-weight:700; letter-spacing:-0.5px;
    ">You</div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -24],
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface WasteMapProps {
  locations: DisposalLocation[];
  userLat: number;
  userLng: number;
  activeCategory: WasteCategory | 'all';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WasteMap({ locations, userLat, userLng, activeCategory }: WasteMapProps) {
  const filtered =
    activeCategory === 'all'
      ? locations
      : locations.filter((loc) => loc.category.includes(activeCategory as WasteCategory));

  return (
    <MapContainer
      center={[userLat, userLng]}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
      />

      {/* User location */}
      <Marker position={[userLat, userLng]} icon={userIcon}>
        <Popup>
          <div style={{ fontFamily: 'sans-serif', minWidth: 120 }}>
            <strong>📍 Your Location</strong>
          </div>
        </Popup>
      </Marker>

      {/* Disposal location markers */}
      {filtered.map((loc) => {
        const primaryCat = (loc.category[0] ?? 'dry') as WasteCategory;
        const distKm = getDistance(userLat, userLng, loc.lat, loc.lng);

        return (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={createCategoryIcon(primaryCat)}
          >
            <Popup minWidth={200}>
              <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.5 }}>
                {/* Name */}
                <p style={{ fontWeight: 700, marginBottom: 6, color: '#111' }}>{loc.name}</p>

                {/* Category badges */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                  {loc.category.map((cat) => {
                    const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG['dry'];
                    return (
                      <span
                        key={cat}
                        style={{
                          background: `${cfg.color}22`,
                          color: cfg.color,
                          border: `1px solid ${cfg.color}44`,
                          borderRadius: 12,
                          padding: '1px 8px',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {cfg.emoji} {cfg.label}
                      </span>
                    );
                  })}
                </div>

                {/* Address */}
                <p style={{ color: '#555', marginBottom: 4 }}>📌 {loc.address}</p>

                {/* Timing */}
                <p style={{ color: '#555', marginBottom: 4 }}>🕐 {loc.timing}</p>

                {/* Distance */}
                <p style={{ color: '#10B981', fontWeight: 600 }}>
                  📍 {formatDistance(distKm)} away
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
