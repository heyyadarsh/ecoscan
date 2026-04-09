import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  increment,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { WasteCategory } from '@/types';

export interface FeedbackRecord {
  userId: string;
  itemName: string;
  aiCategory: WasteCategory;
  userFeedback: 'correct' | 'incorrect';
  correctedCategory: WasteCategory | null;
  timestamp: number;
  imageHash?: string;
}

/** Submit user feedback on a classification result. Never throws — all errors are swallowed. */
export async function submitFeedback(
  userId: string,
  itemName: string,
  aiCategory: WasteCategory,
  feedbackType: 'correct' | 'incorrect',
  correctedCategory: WasteCategory | null
): Promise<void> {
  try {
    // 1. Save individual feedback record
    await addDoc(collection(db, 'feedback'), {
      userId,
      itemName: itemName.toLowerCase().trim(),
      aiCategory,
      userFeedback: feedbackType,
      correctedCategory: correctedCategory || null,
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
    });

    // 2. Update aggregate stats for this item
    const statsKey = itemName.toLowerCase().trim().replace(/\s+/g, '_');
    const statsRef = doc(db, 'feedback_stats', statsKey);
    const statsSnap = await getDoc(statsRef);

    if (!statsSnap.exists()) {
      await setDoc(statsRef, {
        itemName: itemName.toLowerCase().trim(),
        aiCategory,
        totalFeedback: 1,
        correctCount: feedbackType === 'correct' ? 1 : 0,
        incorrectCount: feedbackType === 'incorrect' ? 1 : 0,
        corrections: correctedCategory ? { [correctedCategory]: 1 } : {},
        accuracyRate: feedbackType === 'correct' ? 100 : 0,
        lastUpdated: serverTimestamp(),
      });
    } else {
      const existing = statsSnap.data();
      const newTotal = (existing.totalFeedback || 0) + 1;
      const newCorrect = (existing.correctCount || 0) + (feedbackType === 'correct' ? 1 : 0);

      const updateData: Record<string, unknown> = {
        totalFeedback: increment(1),
        accuracyRate: Math.round((newCorrect / newTotal) * 100),
        lastUpdated: serverTimestamp(),
      };

      if (feedbackType === 'correct') {
        updateData.correctCount = increment(1);
      } else {
        updateData.incorrectCount = increment(1);
        if (correctedCategory) {
          updateData[`corrections.${correctedCategory}`] = increment(1);
        }
      }

      await updateDoc(statsRef, updateData);
    }

    // 3. Award +5 bonus points to the user for giving feedback
    if (userId && userId !== 'anonymous') {
      await updateDoc(doc(db, 'users', userId), {
        totalPoints: increment(5),
        weeklyPoints: increment(5),
      });
    }
  } catch (error) {
    // Never crash the app due to feedback errors
    console.warn('[EcoScan] Feedback submission failed (non-blocking):', error);
  }
}

/** Get accuracy % for a specific item (0–100), or null if no data yet. */
export async function getItemAccuracy(itemName: string): Promise<number | null> {
  try {
    const statsRef = doc(
      db,
      'feedback_stats',
      itemName.toLowerCase().trim().replace(/\s+/g, '_')
    );
    const snap = await getDoc(statsRef);
    if (snap.exists()) return snap.data().accuracyRate ?? null;
    return null;
  } catch {
    return null;
  }
}

/** Return the most community-corrected category for an item, or null. */
export async function getMostCorrectedCategory(itemName: string): Promise<WasteCategory | null> {
  try {
    const statsRef = doc(
      db,
      'feedback_stats',
      itemName.toLowerCase().trim().replace(/\s+/g, '_')
    );
    const snap = await getDoc(statsRef);
    if (!snap.exists()) return null;

    const corrections = (snap.data().corrections ?? {}) as Record<string, number>;
    if (Object.keys(corrections).length === 0) return null;

    return Object.entries(corrections).sort(
      ([, a], [, b]) => (b as number) - (a as number)
    )[0][0] as WasteCategory;
  } catch {
    return null;
  }
}
