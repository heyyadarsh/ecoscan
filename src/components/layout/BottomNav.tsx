'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, MapPin, Trophy, User } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { playNavClick } from '@/lib/sounds';

const NAV_ITEMS = [
  { href: '/', label: 'Scan', icon: Camera },
  { href: '/map', label: 'Map', icon: MapPin },
  { href: '/leaderboard', label: 'Ranks', icon: Trophy },
  { href: '/profile', label: 'Profile', icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const scanCount = Number(user?.scanCount);
  const showScanBadge = !isNaN(scanCount) && scanCount > 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-md mx-auto">
        <div
          className="glass-nav px-2 pb-safe"
          style={{
            background: 'rgba(6,10,6,0.90)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(16,185,129,0.1)',
          }}
        >
          <div className="grid grid-cols-4">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              const isScan = href === '/';

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={!isActive ? playNavClick : undefined}
                  className="flex flex-col items-center justify-center py-3 gap-1 relative transition-all duration-200 group"
                  style={{ color: isActive ? '#34D399' : 'rgba(240,253,244,0.3)' }}
                >
                  {/* Active indicator dot */}
                  {isActive && <span className="nav-active-dot" />}

                  {isScan ? (
                    <span
                      className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200${isActive ? ' subtle-float' : ''}`}
                      style={
                        isActive
                          ? { background: 'rgba(16,185,129,0.15)', color: '#34D399' }
                          : {}
                      }
                    >
                      <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-sm scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <Icon size={26} strokeWidth={isActive ? 2.2 : 1.8} />
                      {showScanBadge && (
                        <span
                          className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center leading-none"
                          style={{ backgroundColor: '#10B981', color: '#060A06' }}
                        >
                          {scanCount > 99 ? '99+' : scanCount}
                        </span>
                      )}
                    </span>
                  ) : (
                    <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                  )}

                  <span
                    className="text-[10px] font-semibold tracking-wide"
                    style={{ color: isActive ? '#34D399' : 'rgba(240,253,244,0.3)' }}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
