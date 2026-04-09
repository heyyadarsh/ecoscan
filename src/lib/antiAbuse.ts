import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import type { WasteCategory } from '@/types';

const DAILY_SCAN_LIMIT = 20;
const COOLDOWN_SECONDS = 60;

/** Lightweight, deterministic hash of a base64 image — no crypto library required. */
export function hashImage(base64: string): string {
  const sample = base64.slice(0, 200) + base64.slice(-200) + base64.length;
  let hash = 0;
  for (let i = 0; i < sample.length; i++) {
    const char = sample.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // convert to 32-bit int
  }
  return Math.abs(hash).toString(36);
}

export interface AbuseCheckResult {
  allowed: boolean;
  reason: string | null;
  pointsMultiplier: number; // 1.0 = full points, 0 = no points
  warningMessage: string | null;
}

/**
 * Full abuse check — run ONCE after the API returns the real category.
 * Checks: cooldown → daily limit → duplicate image → category spam.
 * On any Firestore error, silently allows the scan so legitimate users are never blocked.
 */
export async function checkScanAllowed(
  userId: string,
  imageBase64: string,
  category: WasteCategory
): Promise<AbuseCheckResult> {
  try {
    const imageHash = hashImage(imageBase64);
    const now = Date.now();
    const todayKey = new Date().toISOString().split('T')[0];

    const abuseRef = doc(db, 'abuse_tracking', userId);
    const snap = await getDoc(abuseRef);

    if (!snap.exists()) {
      // First scan ever — always allowed, seed the document
      await setDoc(abuseRef, {
        userId,
        lastScanTime: now,
        todayKey,
        dailyScanCount: 1,
        recentHashes: [imageHash],
        categoryHistory: [category],
        createdAt: serverTimestamp(),
      });
      return { allowed: true, reason: null, pointsMultiplier: 1.0, warningMessage: null };
    }

    const data = snap.data();
    const isNewDay = data.todayKey !== todayKey;
    const dailyCount = isNewDay ? 0 : (data.dailyScanCount || 0);

    // ── CHECK 1: Cooldown ────────────────────────────────────────────────────
    const secondsSinceLastScan = (now - (data.lastScanTime || 0)) / 1000;
    if (secondsSinceLastScan < COOLDOWN_SECONDS) {
      const waitSeconds = Math.ceil(COOLDOWN_SECONDS - secondsSinceLastScan);
      return {
        allowed: false,
        reason: 'cooldown',
        pointsMultiplier: 0,
        warningMessage: `Please wait ${waitSeconds}s before scanning again.`,
      };
    }

    // ── CHECK 2: Daily limit ─────────────────────────────────────────────────
    if (dailyCount >= DAILY_SCAN_LIMIT) {
      return {
        allowed: false,
        reason: 'daily_limit',
        pointsMultiplier: 0,
        warningMessage: `Daily limit of ${DAILY_SCAN_LIMIT} scans reached. Come back tomorrow!`,
      };
    }

    // ── CHECK 3: Duplicate image ─────────────────────────────────────────────
    const recentHashes: string[] = data.recentHashes || [];
    if (recentHashes.includes(imageHash)) {
      // Still allowed but 0 points; update time + count so cooldown is enforced
      await updateDoc(abuseRef, {
        lastScanTime: now,
        todayKey,
        dailyScanCount: isNewDay ? 1 : increment(1),
      });
      return {
        allowed: true,
        reason: 'duplicate_image',
        pointsMultiplier: 0,
        warningMessage: 'This image was already scanned. No points awarded for duplicates.',
      };
    }

    // ── CHECK 4: Category spam — diminishing returns ─────────────────────────
    const categoryHistory: WasteCategory[] = data.categoryHistory || [];
    const recentSameCategory = categoryHistory.slice(-5).filter((c) => c === category).length;
    let pointsMultiplier = 1.0;
    let warningMessage: string | null = null;

    if (recentSameCategory >= 4) {
      pointsMultiplier = 0.2;
      warningMessage = 'Scan different waste types for full points! (Reduced points for repetition)';
    } else if (recentSameCategory >= 2) {
      pointsMultiplier = 0.6;
      warningMessage = 'Try scanning different categories for bonus points!';
    }

    // All checks passed — persist updated tracking state
    const updatedHashes = [...recentHashes.slice(-19), imageHash];
    const updatedHistory = [...categoryHistory.slice(-19), category];

    await updateDoc(abuseRef, {
      lastScanTime: now,
      todayKey,
      dailyScanCount: isNewDay ? 1 : increment(1),
      recentHashes: updatedHashes,
      categoryHistory: updatedHistory,
    });

    return { allowed: true, reason: null, pointsMultiplier, warningMessage };
  } catch (error) {
    // If the check itself throws, always allow scan (never block legitimate users)
    console.warn('[EcoScan] Abuse check failed (non-blocking):', error);
    return { allowed: true, reason: null, pointsMultiplier: 1.0, warningMessage: null };
  }
}

/** How many scans this user has left today (never throws). */
export async function getDailyScansRemaining(userId: string): Promise<number> {
  try {
    const todayKey = new Date().toISOString().split('T')[0];
    const snap = await getDoc(doc(db, 'abuse_tracking', userId));
    if (!snap.exists()) return DAILY_SCAN_LIMIT;
    const data = snap.data();
    if (data.todayKey !== todayKey) return DAILY_SCAN_LIMIT;
    return Math.max(0, DAILY_SCAN_LIMIT - (data.dailyScanCount || 0));
  } catch {
    return DAILY_SCAN_LIMIT;
  }
}
