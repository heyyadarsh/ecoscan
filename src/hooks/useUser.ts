'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { ensureAnonymousAuth, db } from '@/lib/firebase';
import { getOrCreateUser } from '@/lib/points';
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
        setUser(userData);
        setLoading(false);

        unsubscribeSnapshot = onSnapshot(doc(db, 'users', uid), (snap) => {
          if (snap.exists()) {
            setUser(snap.data() as User);
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
