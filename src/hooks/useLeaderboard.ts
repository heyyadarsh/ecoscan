'use client';

import { useState, useEffect } from 'react';
import { getLeaderboard } from '@/lib/points';
import type { User } from '@/types';

export function useLeaderboard(type: 'weekly' | 'alltime' = 'weekly') {
  const [leaders, setLeaders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const data = await getLeaderboard(type);
        if (!cancelled) setLeaders(data);
      } catch (err) {
        console.error('useLeaderboard fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLeaderboard();

    const interval = setInterval(fetchLeaderboard, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [type]);

  return { leaders, loading };
}
