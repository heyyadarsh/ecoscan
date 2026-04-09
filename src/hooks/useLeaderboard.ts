'use client';

import { useState, useEffect } from 'react';
import { getLeaderboard } from '@/lib/points';
import type { User } from '@/types';

export function useLeaderboard(type: 'weekly' | 'alltime' = 'weekly', refreshKey = 0) {
  const [leaders, setLeaders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaderboard() {
      setLoading(true);
      setPermissionError(false);
      try {
        const data = await getLeaderboard(type);
        if (!cancelled) setLeaders(data);
      } catch (err: unknown) {
        if (!cancelled) {
          // Distinguish permission errors so the UI can show a helpful message
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('permission') || msg.includes('insufficient')) {
            setPermissionError(true);
          }
          setLeaders([]);
        }
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
  }, [type, refreshKey]);

  return { leaders, loading, permissionError };
}
