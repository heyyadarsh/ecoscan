'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import { CATEGORY_CONFIG } from '@/constants/wasteConfig';
import type { ScanRecord, WasteCategory } from '@/types';

// ─── Fix Leaflet default icon ────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
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

interface ScanCluster {
  lat: number;
  lng: number;
  count: number;
  categories: WasteCategory[];
  totalPoints: number;
  totalCO2: number;
}

function clusterScans(scans: ScanRecord[]): ScanCluster[] {
  const gridSize = 0.002; // ~200m clusters
  const buckets: Record<string, ScanCluster> = {};
  for (const s of scans) {
    if (!s.lat || !s.lng) continue;
    const key = `${Math.round(s.lat / gridSize) * gridSize}_${Math.round(s.lng / gridSize) * gridSize}`;
    if (!buckets[key]) {
      buckets[key] = {
        lat: s.lat,
        lng: s.lng,
        count: 0,
        categories: [],
        totalPoints: 0,
        totalCO2: 0,
      };
    }
    buckets[key].count++;
    buckets[key].totalPoints += s.points_earned || 0;
    buckets[key].totalCO2 += s.co2_saved_kg || 0;
    const cat = s.category?.toLowerCase() as WasteCategory;
    if (cat && !buckets[key].categories.includes(cat)) {
      buckets[key].categories.push(cat);
    }
  }
  return Object.values(buckets);
}

function FitBounds({ clusters, userLat, userLng }: { clusters: ScanCluster[]; userLat: number; userLng: number }) {
  const map = useMap();
  useEffect(() => {
    if (clusters.length === 0) {
      map.setView([userLat, userLng], 14);
      return;
    }
    const allLats = [userLat, ...clusters.map((c) => c.lat)];
    const allLngs = [userLng, ...clusters.map((c) => c.lng)];
    const bounds = L.latLngBounds(
      [Math.min(...allLats) - 0.005, Math.min(...allLngs) - 0.005],
      [Math.max(...allLats) + 0.005, Math.max(...allLngs) + 0.005],
    );
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
  }, [clusters, userLat, userLng, map]);
  return null;
}

interface EcoZoneMapProps {
  scans: ScanRecord[];
  userLat: number;
  userLng: number;
}

export default function EcoZoneMap({ scans, userLat, userLng }: EcoZoneMapProps) {
  const clusters = clusterScans(scans);

  return (
    <MapContainer
      center={[userLat, userLng]}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        maxZoom={19}
      />
      <FitBounds clusters={clusters} userLat={userLat} userLng={userLng} />

      {/* User location */}
      <Marker position={[userLat, userLng]} icon={userIcon}>
        <Popup>
          <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 120 }}>
            <strong style={{ color: '#111' }}>📍 Your Location</strong>
          </div>
        </Popup>
      </Marker>

      {/* Eco-zone circles */}
      {clusters.map((cluster, i) => {
        const radius = Math.min(80 + cluster.count * 40, 350);
        const opacity = Math.min(0.15 + cluster.count * 0.08, 0.55);
        const primaryCat = cluster.categories[0] || 'dry';
        const color = CATEGORY_CONFIG[primaryCat]?.color || '#10B981';

        return (
          <Circle
            key={i}
            center={[cluster.lat, cluster.lng]}
            radius={radius}
            pathOptions={{
              color: color,
              weight: 2,
              opacity: 0.7,
              fillColor: color,
              fillOpacity: opacity,
            }}
          >
            <Popup minWidth={180}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '2px 0' }}>
                <p style={{ fontWeight: 800, color: '#111', fontSize: 14, marginBottom: 6 }}>
                  EcoZone
                </p>
                <div style={{
                  background: '#10B98115',
                  border: '1px solid #10B98133',
                  borderRadius: 8,
                  padding: '6px 10px',
                  marginBottom: 8,
                }}>
                  <span style={{ fontWeight: 700, color: '#059669', fontSize: 18 }}>
                    {cluster.count}
                  </span>
                  <span style={{ color: '#555', fontSize: 12, marginLeft: 4 }}>
                    scan{cluster.count > 1 ? 's' : ''} here
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                  {cluster.categories.map((cat) => {
                    const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG['dry'];
                    return (
                      <span key={cat} style={{
                        background: `${cfg.color}18`,
                        color: cfg.color,
                        border: `1px solid ${cfg.color}55`,
                        borderRadius: 100,
                        padding: '2px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                      }}>
                        {cfg.emoji} {cfg.label}
                      </span>
                    );
                  })}
                </div>
                <p style={{ color: '#059669', fontWeight: 600, fontSize: 12 }}>
                  +{cluster.totalPoints} pts · {cluster.totalCO2.toFixed(2)}kg CO₂
                </p>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </MapContainer>
  );
}
