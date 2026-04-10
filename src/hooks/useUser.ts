'use client';

import { useState, useEffect, useRef } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { getOrCreateUser, updateUserName } from '@/lib/points';
import type { User } from '@/types';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const snapshotUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Phones on slow Wi‑Fi / HTTP LAN can stall on Firebase; never block UI forever
    const INIT_MS = 12000;
    const bailTimer = window.setTimeout(() => {
      console.warn('[useUser] Auth init slow — unlocking UI (Firebase may still connect)');
      setLoading(false);
    }, INIT_MS);
    const cancelBail = () => window.clearTimeout(bailTimer);

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      snapshotUnsubRef.current?.();
      snapshotUnsubRef.current = null;

      if (!firebaseUser) {
        try {
          await signInAnonymously(auth);
          // onAuthStateChanged fires again with the anonymous user
        } catch (err) {
          console.error('[useUser] Anonymous sign-in failed:', err);
          cancelBail();
          setLoading(false);
        }
        return;
      }

      const uid = firebaseUser.uid;
      const anon = firebaseUser.isAnonymous;

      try {
        const userData = await getOrCreateUser(uid);

        const displayName = firebaseUser.displayName;
        if (userData.name === 'EcoWarrior' && displayName) {
          await updateUserName(uid, displayName);
          userData.name = displayName;
        }

        setUserId(uid);
        setIsAnonymous(anon);
        setUser(userData);
        cancelBail();
        setLoading(false);

        snapshotUnsubRef.current = onSnapshot(doc(db, 'users', uid), (snap) => {
          if (snap.exists()) {
            setUser({ id: snap.id, ...snap.data() } as User);
          }
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isPermErr = msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('insufficient');

        if (isPermErr) {
          // Firestore rules are blocking access.
          // Fall back to an auth-only user so the app stays usable.
          // Points / scan history won't load until rules are fixed.
          console.warn('[useUser] Firestore permission denied — update your security rules. ' +
            'App is running in limited mode (no points/history until rules are fixed).');
        } else {
          console.error('[useUser] Auth callback error:', err);
        }

        // Always provide a minimal user so the UI doesn't stay on loading screen
        const fallback: User = {
          id: uid,
          name: firebaseUser.displayName || (anon ? 'EcoWarrior' : 'User'),
          totalPoints: 0,
          scanCount: 0,
          weeklyPoints: 0,
          streak: 0,
          lastScanDate: '',
          city: 'India',
          createdAt: Date.now(),
        };
        setUserId(uid);
        setIsAnonymous(anon);
        setUser(fallback);
        cancelBail();
        setLoading(false);
      }
    });

    return () => {
      cancelBail();
      authUnsub();
      snapshotUnsubRef.current?.();
    };
  }, []);

  async function refreshUser() {
    if (!userId) return;
    try {
      const userData = await getOrCreateUser(userId);
      setUser(userData);
    } catch {
      // silently ignore refresh failures
    }
  }

  return { user, userId, isAnonymous, loading, refreshUser };
}
