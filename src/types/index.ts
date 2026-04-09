export type WasteCategory = 'dry' | 'wet' | 'hazardous' | 'ewaste';

export interface ClassificationResult {
  item_name: string;
  category: WasteCategory;
  subcategory: string;
  confidence: number;
  recyclable: boolean;
  disposal_steps: string[];
  co2_saved_kg: number;
  fun_fact: string;
  hindi_instruction: string;
  points_earned: number;
}

export interface User {
  id: string;
  name: string;
  totalPoints: number;
  scanCount: number;
  weeklyPoints: number;
  streak: number;
  lastScanDate: string;
  city: string;
  createdAt: number;
}

export interface ScanRecord {
  id: string;
  userId: string;
  item_name: string;
  category: WasteCategory;
  points_earned: number;
  co2_saved_kg: number;
  timestamp: number;
  lat?: number;
  lng?: number;
}

export interface DisposalLocation {
  id: string;
  name: string;
  category: WasteCategory[];
  lat: number;
  lng: number;
  address: string;
  timing: string;
  type: string;
}
