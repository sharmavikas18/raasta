// RAASTA TopBar Component — PRD §6, §19, §20
'use client';

import React from 'react';
import Link from 'next/link';

interface TopBarProps {
  onMobileMenuToggle?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onMobileMenuToggle }) => {
  return (
    <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {onMobileMenuToggle && (
          <button
            type="button"
            onClick={onMobileMenuToggle}
            className="md:hidden p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900"
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
        )}
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>AWS Serverless Active</span>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <span className="text-zinc-700 dark:text-zinc-300 font-semibold">Bedrock Model: Claude 3</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/journeys/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-semibold shadow-sm transition-all"
        >
          <span>+</span>
          <span>New Goal</span>
        </Link>

        {/* User Pill */}
        <Link
          href="/profile"
          className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          title="User Profile & Accessibility Settings"
        >
          <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-[10px] font-bold text-white flex items-center justify-center">
            AP
          </div>
          <span className="font-medium text-zinc-700 dark:text-zinc-300 hidden sm:inline">
            Aarav Patel
          </span>
        </Link>
      </div>
    </header>
  );
};
