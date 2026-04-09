import type { DisposalLocation, WasteCategory } from '@/types';

export interface Coordinates {
  lat: number;
  lng: number;
  city?: string;
}

export function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

export async function getCurrentLocation(): Promise<Coordinates> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: 26.2183, lng: 78.1828, city: 'Gwalior' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: 26.2183, lng: 78.1828, city: 'Gwalior' }),
      { timeout: 5000, maximumAge: 60000 },
    );
  });
}

export async function getCityName(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      {
        headers: { 'User-Agent': 'EcoScan-App/1.0' },
        cache: 'no-store',
      },
    );
    const data = await response.json();
    const addr = data.address || {};
    return (
      addr.city ||
      addr.town ||
      addr.city_district ||
      addr.county ||
      addr.state_district ||
      addr.state ||
      'Gwalior'
    );
  } catch {
    return 'Gwalior';
  }
}

export function generateNearbyLocations(
  centerLat: number,
  centerLng: number,
  city: string,
): DisposalLocation[] {
  const offsets: Array<{
    dlat: number;
    dlng: number;
    name: string;
    cats: WasteCategory[];
    timing: string;
  }> = [
    { dlat: 0.012, dlng: 0.008, name: `Municipal Dry Waste Center`, cats: ['dry'], timing: '6AM-12PM' },
    { dlat: -0.008, dlng: 0.015, name: `${city} Composting Unit`, cats: ['wet'], timing: '7AM-11AM' },
    { dlat: 0.005, dlng: -0.012, name: `E-Waste Collection Hub`, cats: ['ewaste', 'dry'], timing: '9AM-6PM' },
    { dlat: -0.015, dlng: -0.006, name: `Hazardous Waste Drop Center`, cats: ['hazardous'], timing: '10AM-4PM' },
    { dlat: 0.018, dlng: 0.003, name: `Recycling & Segregation Hub`, cats: ['dry', 'ewaste'], timing: '8AM-8PM' },
    { dlat: -0.003, dlng: -0.018, name: `Swachh ${city} Collection Point`, cats: ['dry', 'wet'], timing: '5AM-10AM' },
    { dlat: 0.022, dlng: -0.009, name: `${city} Organic Waste Unit`, cats: ['wet'], timing: '6AM-9AM' },
    { dlat: -0.011, dlng: 0.022, name: `Battery & Chemical Drop`, cats: ['hazardous'], timing: '11AM-5PM' },
  ];

  return offsets.map((o, i) => ({
    id: `loc_${i + 1}`,
    name: o.name,
    category: o.cats,
    lat: centerLat + o.dlat,
    lng: centerLng + o.dlng,
    address: `Near ${city} Zone ${i + 1}`,
    timing: o.timing,
    type: o.cats[0],
  }));
}
