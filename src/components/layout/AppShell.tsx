'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from './BottomNav';
import SplineBackground from '@/components/SplineBackground';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  return (
    // No background here — html element provides the dark base (#060A06)
    // AppShell itself is transparent so SplineBackground (fixed, z-0) shows through
    <div className="min-h-screen flex flex-col items-center noise-overlay" style={{ background: 'transparent' }}>

      {/* Ambient background orbs */}
      <div className="ambient-orb ambient-orb-1" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-2" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-3" aria-hidden="true" />

      <div className="relative z-10 w-full flex flex-col items-center">
        {/* 3D background — only on the scan/landing page, rendered at ROOT level */}
        {/* Placed here (outside any z-index stacking context) so z-0 is true root z-0 */}
        {isLanding && <SplineBackground />}

        <div
          className="w-full max-w-md mx-auto min-h-screen flex flex-col relative pb-24"
          style={{ background: 'transparent' }}
        >
          {children}
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
