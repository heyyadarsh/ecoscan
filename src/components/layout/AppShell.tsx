'use client';

import { BottomNav } from './BottomNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center">
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col relative pb-24">
        {children}
        <BottomNav />
      </div>
    </div>
  );
}
