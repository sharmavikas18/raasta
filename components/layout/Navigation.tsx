// RAASTA Main Navigation Component — PRD §6, §19, §20, §21
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Home', href: '/', icon: '⌂' },
  { name: 'My Journeys', href: '/journeys', icon: '☍' },
  { name: 'Create Journey', href: '/journeys/new', icon: '+' },
  { name: 'Documents', href: '/documents', icon: '▤' },
  { name: 'Profile & Accessibility', href: '/profile', icon: '⚙' },
];

export const Navigation: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside
      className="w-full md:w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md flex flex-col justify-between p-4"
      aria-label="Main Navigation"
    >
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="px-3 py-2">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-600 to-rose-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              R
            </div>
            <div>
              <span className="font-bold tracking-tight text-lg text-zinc-900 dark:text-zinc-50 block leading-tight">
                RAASTA
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium tracking-wide">
                Know before you need to know
              </span>
            </div>
          </Link>
        </div>

        {/* Links */}
        <nav className="space-y-1" aria-label="Sidebar links">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold w-5 text-center">{item.icon}</span>
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Trust Badge */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/80 px-3">
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Real-World Foresight</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Deterministic graph tracking. Bedrock LLM reasoning only when required.
          </p>
        </div>
      </div>
    </aside>
  );
};
