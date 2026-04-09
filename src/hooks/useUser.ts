'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { ensureAnonymousAuth, db, auth } from '@/lib/firebase';
import { getOrCreateUser, updateUserName } from '@/lib/points';
import type { User } from '@/types';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    async function init() {
      try {
        const uid = await ensureAnonymousAuth();
        setUserId(uid);

        const userData = await getOrCreateUser(uid);

        // If still using the default name, try to pull a real name from Google Auth
        const displayName = auth.currentUser?.displayName;
        if (userData.name === 'EcoWarrior' && displayName) {
          await updateUserName(uid, displayName);
          userData.name = displayName;
        }

        setUser(userData);
        setLoading(false);

        unsubscribeSnapshot = onSnapshot(doc(db, 'users', uid), (snap) => {
          if (snap.exists()) {
            setUser({ id: snap.id, ...snap.data() } as User);
          }
        });
      } catch (err) {
        console.error('useUser init error:', err);
        setLoading(false);
      }
    }

    init();

    return () => {
      unsubscribeSnapshot?.();
    };
  }, []);

  async function refreshUser() {
    if (!userId) return;
    const userData = await getOrCreateUser(userId);
    setUser(userData);
  }

  return { user, userId, loading, refreshUser };
}
