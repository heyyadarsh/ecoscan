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
        position:relative;
        width:40px; height:48px;
        display:flex; flex-direction:column; align-items:center;
      ">
        <div style="
          width:40px; height:40px; border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:${cfg.color};
          border:2.5px solid white;
          box-shadow:0 3px 12px rgba(0,0,0,0.35);
          display:flex; align-items:center; justify-content:center;
        ">
          <span style="transform:rotate(45deg); font-size:18px; line-height:1;">${cfg.emoji}</span>
        </div>
        <div style="
          width:6px; height:6px; border-radius:50%;
          background:${cfg.color}; margin-top:-2px;
          box-shadow:0 2px 4px rgba(0,0,0,0.3);
        "></div>
      </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 48],
    popupAnchor: [0, -50],
  });
}

const userIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative; width:44px; height:44px;">
      <div style="
        position:absolute; inset:0; border-radius:50%;
        background:rgba(59,130,246,0.2);
        animation:ping 1.5s ease-out infinite;
      "></div>
      <div style="
        position:absolute; inset:4px; border-radius:50%;
        background:#3B82F6;
        border:3px solid white;
        box-shadow:0 2px 14px rgba(59,130,246,0.6);
        display:flex; align-items:center; justify-content:center;
        color:white; font-size:9px; font-weight:800; letter-spacing:-0.3px;
      ">YOU</div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -26],
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
      zoom={15}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      {/* Voyager tiles — crisp land/street detail, light background */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        maxZoom={19}
      />

      {/* User location */}
      <Marker position={[userLat, userLng]} icon={userIcon}>
            <Popup>
          <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 130, padding: '2px 0' }}>
            <strong style={{ color: '#1a1a1a', fontSize: 13 }}>📍 Your Location</strong>
            <p style={{ color: '#555', fontSize: 11, marginTop: 3 }}>GPS position</p>
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
            <Popup minWidth={210}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, lineHeight: 1.5, padding: '2px 0' }}>
                {/* Name */}
                <p style={{ fontWeight: 800, marginBottom: 6, color: '#111', fontSize: 14 }}>{loc.name}</p>

                {/* Category badges */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                  {loc.category.map((cat) => {
                    const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG['dry'];
                    return (
                      <span
                        key={cat}
                        style={{
                          background: `${cfg.color}18`,
                          color: cfg.color,
                          border: `1px solid ${cfg.color}55`,
                          borderRadius: 100,
                          padding: '2px 9px',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {cfg.emoji} {cfg.label}
                      </span>
                    );
                  })}
                </div>

                {/* Distance callout */}
                <div style={{
                  background: '#10B98112',
                  border: '1px solid #10B98133',
                  borderRadius: 8,
                  padding: '4px 10px',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span style={{ fontSize: 13 }}>📍</span>
                  <span style={{ color: '#059669', fontWeight: 700, fontSize: 13 }}>
                    {formatDistance(distKm)} away
                  </span>
                </div>

                {/* Address */}
                <p style={{ color: '#444', marginBottom: 3, fontSize: 12 }}>📌 {loc.address}</p>

                {/* Timing */}
                <p style={{ color: '#666', fontSize: 12 }}>🕐 {loc.timing}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
