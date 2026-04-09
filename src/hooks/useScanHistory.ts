'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ScanRecord } from '@/types';

export function useScanHistory(userId: string) {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setScans([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchHistory() {
      setLoading(true);
      try {
        const q = query(collection(db, 'scans'), where('userId', '==', userId));
        const snap = await getDocs(q);
        const records = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as ScanRecord)
          .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
          .slice(0, 20);

        if (!cancelled) setScans(records);
      } catch (err) {
        console.error('useScanHistory fetch error:', err);
        if (!cancelled) setScans([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { scans, loading };
}
