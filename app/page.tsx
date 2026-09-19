// RAASTA Home Dashboard — PRD §6
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Journey, User, JourneyDetail } from '@/types/domain';
import { JourneyCard } from '@/components/journey/JourneyCard';
import { DoThisNowCard } from '@/components/journey/DoThisNowCard';
import { ForesightCard } from '@/components/journey/ForesightCard';

export default function HomePage() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [activeDetail, setActiveDetail] = useState<JourneyDetail | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [jRes, pRes] = await Promise.all([
          fetch('/api/journeys'),
          fetch('/api/profile'),
        ]);
        const jData = await jRes.json();
        const pData = await pRes.json();

        setJourneys(jData.journeys || []);
        setUser(pData.user || null);

        // Load detail of the first active journey for the attention queue
        if (jData.journeys && jData.journeys.length > 0) {
          const detailRes = await fetch(`/api/journeys/${jData.journeys[0].id}`);
          const detailData = await detailRes.json();
          setActiveDetail(detailData);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const handleCompleteAction = async (nodeId: string) => {
    if (!activeDetail) return;
    try {
      const res = await fetch(`/api/nodes/${nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyId: activeDetail.journey.id,
          status: 'COMPLETED',
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveDetail(updated);
        // Refresh journeys list
        const jRes = await fetch('/api/journeys');
        const jData = await jRes.json();
        setJourneys(jData.journeys || []);
      }
    } catch (err) {
      console.error('Failed to complete action:', err);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3">
        <div className="h-8 w-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div>
        <p className="text-xs text-zinc-500 animate-pulse font-medium">
          Loading your active journeys & foresight...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Contextual Greeting & Hero */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
            <span>● Live Journey Engine</span>
            <span>·</span>
            <span>Foresight Active</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight mt-1">
            Welcome, {user?.name || 'Aarav'}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Here is what requires your attention before you discover it too late.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors shadow-sm"
          >
            <span>📄 Upload Notice PDF</span>
          </Link>
          <Link
            href="/journeys/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-transform active:scale-95"
          >
            <span>+ Start New Goal</span>
          </Link>
        </div>
      </div>

      {/* 2. Attention Queue — Single Most Important Action */}
      {activeDetail && activeDetail.nextAction && (
        <section aria-labelledby="attention-queue-heading">
          <div className="flex items-center justify-between mb-3">
            <h2
              id="attention-queue-heading"
              className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2"
            >
              <span className="h-2 w-2 rounded-full bg-orange-500"></span>
              <span>Priority Attention Queue — {activeDetail.journey.title}</span>
            </h2>
            <Link
              href={`/journeys/${activeDetail.journey.id}`}
              className="text-xs font-semibold text-orange-600 hover:underline"
            >
              View complete graph →
            </Link>
          </div>
          <DoThisNowCard
            nextAction={activeDetail.nextAction}
            onCompleteAction={handleCompleteAction}
          />
        </section>
      )}

      {/* 3. Journey Readiness Grid */}
      <section aria-labelledby="journeys-grid-heading">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              id="journeys-grid-heading"
              className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
            >
              Active Journeys
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Real-world goals tracked with dependency graphs
            </p>
          </div>
          <Link
            href="/journeys"
            className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            View all ({journeys.length})
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {journeys.map((j) => (
            <JourneyCard
              key={j.id}
              journey={j}
              blockersCount={j.id === activeDetail?.journey.id ? activeDetail.readiness.blockerCount : 1}
              unknownsCount={j.id === activeDetail?.journey.id ? activeDetail.readiness.criticalUnknowns : 1}
            />
          ))}
        </div>
      </section>

      {/* 4. Foresight Feed */}
      {activeDetail && activeDetail.foresightInsights.length > 0 && (
        <section aria-labelledby="foresight-feed-heading">
          <h2 id="foresight-feed-heading" className="sr-only">
            Preventative Foresight
          </h2>
          <ForesightCard insights={activeDetail.foresightInsights} />
        </section>
      )}

      {/* 5. 3-Minute Demo Guide Banner */}
      <div className="p-5 rounded-2xl border border-dashed border-orange-500/40 bg-orange-500/5 dark:bg-orange-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-orange-700 dark:text-orange-400">
            Quick 3-Minute MVP Evaluation Guide (PRD §40)
          </span>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">
            Test the Core Scenarios
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            <strong>Scenario A:</strong> Upload scholarship notice → extract dependencies & unknowns. <br />
            <strong>Scenario B & C:</strong> Inspect Delhi conference → toggle step-free accessibility → simulate venue relocation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/documents"
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-bold hover:bg-zinc-50"
          >
            Scholarship Demo
          </Link>
          <Link
            href="/journeys/jrn_delhi_conference_2026"
            className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold"
          >
            Conference Demo
          </Link>
        </div>
      </div>
    </div>
  );
}
