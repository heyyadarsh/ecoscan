import type { WasteCategory } from '@/types';

export const CATEGORY_CONFIG: Record<
  WasteCategory,
  {
    label: string;
    color: string;
    bgClass: string;
    borderClass: string;
    textClass: string;
    emoji: string;
    binLabel: string;
    points: number;
    description: string;
    examples: string[];
  }
> = {
  dry: {
    label: 'Dry Waste',
    color: '#3B82F6',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500',
    textClass: 'text-blue-400',
    emoji: '♻️',
    binLabel: 'Blue Bin',
    points: 10,
    description: 'Recyclable items like paper, cardboard, plastic, and metal',
    examples: ['Newspaper', 'Plastic bottles', 'Cardboard boxes', 'Aluminium cans'],
  },
  wet: {
    label: 'Wet Waste',
    color: '#22C55E',
    bgClass: 'bg-green-500/10',
    borderClass: 'border-green-500',
    textClass: 'text-green-400',
    emoji: '🌿',
    binLabel: 'Green Bin',
    points: 10,
    description: 'Biodegradable kitchen and garden waste',
    examples: ['Vegetable peels', 'Leftover dal/sabzi', 'Tea leaves', 'Fruit scraps'],
  },
  hazardous: {
    label: 'Hazardous Waste',
    color: '#EF4444',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500',
    textClass: 'text-red-400',
    emoji: '⚠️',
    binLabel: 'Red Bin / Special Center',
    points: 20,
    description: 'Toxic or harmful items needing special disposal',
    examples: ['Old medicines', 'Batteries', 'Paint cans', 'Mosquito repellent cans'],
  },
  ewaste: {
    label: 'E-Waste',
    color: '#F97316',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500',
    textClass: 'text-orange-400',
    emoji: '💻',
    binLabel: 'E-Waste Collection Point',
    points: 25,
    description: 'Electronic and electrical items for certified recycling',
    examples: ['Old mobile phones', 'Broken chargers', 'Damaged earphones', 'Computer parts'],
  },
} as const;

export const POINTS_CONFIG = {
  scanBonus: 5,
  streakMultiplier: 1.5,
  weeklyReset: 'monday',
} as const;
