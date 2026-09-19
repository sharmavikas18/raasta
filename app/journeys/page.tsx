// RAASTA My Journeys List Page — PRD §6
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Journey } from '@/types/domain';
import { JourneyCard } from '@/components/journey/JourneyCard';

export default function MyJourneysPage() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/journeys');
        const data = await res.json();
        setJourneys(data.journeys || []);
      } catch (err) {
        console.error('Failed to load journeys:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = journeys.filter((j) => {
    if (filter === 'ALL') return true;
    return j.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            My Journeys
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Active and completed real-world goal graphs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-1 border border-zinc-200/80 dark:border-zinc-700 text-xs font-semibold">
            {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filter === tab
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {tab === 'ALL' ? 'All Journeys' : tab === 'ACTIVE' ? 'Active' : 'Completed'}
              </button>
            ))}
          </div>

          <Link
            href="/journeys/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-bold shadow-sm transition-all"
          >
            <span>+</span>
            <span>New Journey</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-zinc-500 animate-pulse">
          Loading journeys...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 space-y-3">
          <span className="text-3xl">☍</span>
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
            No Journeys Found
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            You don't have any journeys in this filter view. Start one by typing a goal or uploading an official circular.
          </p>
          <Link
            href="/journeys/new"
            className="inline-block mt-2 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold"
          >
            Create Your First Journey
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((j) => (
            <JourneyCard key={j.id} journey={j} />
          ))}
        </div>
      )}
    </div>
  );
}
