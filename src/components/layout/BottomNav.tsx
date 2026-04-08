'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, MapPin, Trophy, User } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Scan', icon: Camera },
  { href: '/map', label: 'Map', icon: MapPin },
  { href: '/leaderboard', label: 'Ranks', icon: Trophy },
  { href: '/profile', label: 'Profile', icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-md mx-auto">
        <div className="bg-[#111111] border-t border-white/[0.08] px-2 pb-safe">
          <div className="grid grid-cols-4">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              const isScan = href === '/';

              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center justify-center py-3 gap-1 relative transition-colors duration-200 ${
                    isActive ? 'text-emerald-400' : 'text-gray-500'
                  }`}
                >
                  {isActive && !isScan && (
                    <span className="w-1 h-1 rounded-full bg-emerald-400 absolute top-1.5" />
                  )}

                  {isScan ? (
                    <span
                      className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors duration-200 ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'text-gray-500'
                      }`}
                    >
                      <Icon size={26} strokeWidth={isActive ? 2.2 : 1.8} />
                    </span>
                  ) : (
                    <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                  )}

                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
