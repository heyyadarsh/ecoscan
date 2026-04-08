import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  increment,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, ScanRecord, ClassificationResult } from '@/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ─── User ────────────────────────────────────────────────────────────────────

export async function getOrCreateUser(userId: string, city?: string): Promise<User> {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data() as User;
  }

  const newUser: User = {
    id: userId,
    name: 'EcoWarrior',
    totalPoints: 0,
    scanCount: 0,
    weeklyPoints: 0,
    streak: 0,
    lastScanDate: '',
    city: city || 'India',
    createdAt: Date.now(),
  };

  await setDoc(ref, newUser);
  return newUser;
}

export async function updateUserName(userId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { name });
}

export async function updateUserCity(userId: string, city: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { city });
}

// ─── Scan Recording ──────────────────────────────────────────────────────────

export async function recordScan(userId: string, result: ClassificationResult): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  const user = snap.data() as User;

  const today = todayString();
  const yesterday = yesterdayString();

  let newStreak: number;
  if (user.lastScanDate === yesterday) {
    newStreak = (user.streak || 0) + 1;
  } else if (user.lastScanDate === today) {
    newStreak = user.streak || 1;
  } else {
    newStreak = 1;
  }

  await updateDoc(userRef, {
    totalPoints: increment(result.points_earned),
    weeklyPoints: increment(result.points_earned),
    scanCount: increment(1),
    streak: newStreak,
    lastScanDate: today,
  });

  await addDoc(collection(db, 'scans'), {
    userId,
    item_name: result.item_name,
    category: result.category,
    points_earned: result.points_earned,
    co2_saved_kg: result.co2_saved_kg,
    timestamp: Date.now(),
  });
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export async function getLeaderboard(type: 'weekly' | 'alltime'): Promise<User[]> {
  const field = type === 'weekly' ? 'weeklyPoints' : 'totalPoints';
  const q = query(collection(db, 'users'), orderBy(field, 'desc'), limit(10));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as User);
}

export async function getUserRank(userId: string, type: 'weekly' | 'alltime'): Promise<number> {
  const field = type === 'weekly' ? 'weeklyPoints' : 'totalPoints';
  const q = query(collection(db, 'users'), orderBy(field, 'desc'));
  const snap = await getDocs(q);
  const index = snap.docs.findIndex((d) => d.id === userId);
  return index === -1 ? snap.docs.length + 1 : index + 1;
}

// ─── Scan History ─────────────────────────────────────────────────────────────

export async function getUserScanHistory(userId: string): Promise<ScanRecord[]> {
  const q = query(
    collection(db, 'scans'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(20),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ScanRecord);
}

// ─── Demo Seed ───────────────────────────────────────────────────────────────

export async function seedLeaderboardForDemo(): Promise<void> {
  const checkRef = doc(db, 'users', 'demo_user_1');
  const checkSnap = await getDoc(checkRef);
  if (checkSnap.exists()) return;

  const demoUsers: Array<{ id: string; name: string; totalPoints: number }> = [
    { id: 'demo_user_1', name: 'Rahul S.', totalPoints: 480 },
    { id: 'demo_user_2', name: 'Priya M.', totalPoints: 350 },
    { id: 'demo_user_3', name: 'Amit K.', totalPoints: 290 },
    { id: 'demo_user_4', name: 'Sneha R.', totalPoints: 240 },
    { id: 'demo_user_5', name: 'Vikram T.', totalPoints: 180 },
    { id: 'demo_user_6', name: 'Anjali P.', totalPoints: 150 },
  ];

  const writes = demoUsers.map(({ id, name, totalPoints }) => {
    const user: User = {
      id,
      name,
      totalPoints,
      scanCount: Math.round(totalPoints / 12),
      weeklyPoints: Math.round(totalPoints * 0.3),
      streak: Math.floor(Math.random() * 7) + 1,
      lastScanDate: todayString(),
      city: 'India',
      createdAt: Date.now(),
    };
    return setDoc(doc(db, 'users', id), user);
  });

  await Promise.all(writes);
}
