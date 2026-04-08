'use client';

import { useState, useEffect } from 'react';
import { getUserScanHistory } from '@/lib/points';
import type { ScanRecord } from '@/types';

export function useScanHistory(userId: string) {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function fetchHistory() {
      setLoading(true);
      try {
        const data = await getUserScanHistory(userId);
        if (!cancelled) setScans(data);
      } catch (err) {
        console.error('useScanHistory fetch error:', err);
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
