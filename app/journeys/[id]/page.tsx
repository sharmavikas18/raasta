// RAASTA Journey Detail Page — PRD §6, §19, AT-05, AT-06, AT-07
'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { JourneyDetail, NodeStatus, ChangeEvent } from '@/types/domain';
import { ReadinessCard } from '@/components/journey/ReadinessCard';
import { DoThisNowCard } from '@/components/journey/DoThisNowCard';
import { JourneyGraph } from '@/components/journey/JourneyGraph';
import { ForesightCard } from '@/components/journey/ForesightCard';
import { ChangeBanner } from '@/components/journey/ChangeBanner';
import { Icon } from '@/components/ui/Icon';

export default function JourneyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [detail, setDetail] = useState<JourneyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChange, setActiveChange] = useState<ChangeEvent | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    async function loadDetail() {
      try {
        const res = await fetch(`/api/journeys/${id}`);
        if (!res.ok) {
          if (res.status === 403) throw new Error('You do not have permission to access this journey.');
          if (res.status === 404) throw new Error('Journey not found.');
          throw new Error('Failed to load journey.');
        }
        const data: JourneyDetail = await res.json();
        setDetail(data);
        if (data.changeEvents && data.changeEvents.length > 0) {
          setActiveChange(data.changeEvents[0]);
        }
      } catch (err: any) {
        setError(err?.message || 'Error loading journey');
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  const handleStatusChange = async (nodeId: string, newStatus: NodeStatus) => {
    if (!detail) return;
    try {
      const res = await fetch(`/api/nodes/${nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyId: detail.journey.id,
          status: newStatus,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDetail(updated);
      }
    } catch (err) {
      console.error('Failed to update node status:', err);
    }
  };

  // Demo Trigger: Simulate Venue Relocation (AT-07)
  const handleSimulateVenueChange = async () => {
    if (!detail) return;
    setIsSimulating(true);
    try {
      // Find the venue node or first preparation node
      const targetNode =
        detail.nodes.find(
          (n) => n.title.toLowerCase().includes('venue') || n.title.toLowerCase().includes('hall')
        ) || detail.nodes[0];

      const res = await fetch(`/api/journeys/${detail.journey.id}/changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: targetNode.id,
          changeType: 'VENUE_CHANGE',
          oldValue: 'Bharat Mandapam (Pragati Maidan Hall 5)',
          newValue: 'India Habitat Centre (Lodhi Road Main Auditorium)',
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setDetail(updated);
        if (updated.changeEvents && updated.changeEvents.length > 0) {
          setActiveChange(updated.changeEvents[0]);
        }
      }
    } catch (err) {
      console.error('Failed to simulate change:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <div className="h-8 w-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div>
        <p className="text-xs text-zinc-500 font-medium animate-pulse">
          Computing graph dependencies & readiness...
        </p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-8 max-w-lg mx-auto rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-center space-y-4">
        <span className="text-3xl" aria-hidden="true">!</span>
        <h2 className="text-lg font-bold text-rose-900 dark:text-rose-200">
          Unable to Open Journey
        </h2>
        <p className="text-xs text-rose-700 dark:text-rose-400">{error}</p>
        <Link
          href="/journeys"
          className="inline-block px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold"
        >
          ← Return to Journeys
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Change Banner if active change event detected */}
      {activeChange && (
        <ChangeBanner
          changeEvent={activeChange}
          onDismiss={() => setActiveChange(null)}
        />
      )}

      {/* Header & Goal Summary */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {detail.journey.category}
            </span>
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                detail.journey.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}
            >
              {detail.journey.status}
            </span>
            {detail.journey.deadline && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Deadline: <strong>{new Date(detail.journey.deadline).toLocaleDateString()}</strong>
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            {detail.journey.title}
          </h1>

          <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 mt-2 max-w-3xl leading-relaxed">
            {detail.journey.originalIntent}
          </p>
        </div>

        {/* Demo Controls Bar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSimulateVenueChange}
            disabled={isSimulating}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors"
            title="Simulate external venue relocation to test downstream change propagation (AT-07)"
          >
            <Icon name="zap" />
            <span>{isSimulating ? 'Simulating...' : 'Simulate Venue Change'}</span>
          </button>

          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors"
          >
            <><Icon name="accessibility" /> Adapt Accessibility</>
          </Link>
        </div>
      </div>

      {/* Top 2-Column: Readiness & Next Action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <ReadinessCard readiness={detail.readiness} />
        </div>
        <div className="lg:col-span-7">
          <DoThisNowCard
            nextAction={detail.nextAction}
            onCompleteAction={(nodeId) => handleStatusChange(nodeId, 'COMPLETED')}
          />
        </div>
      </div>

      {/* Foresight Insights Feed */}
      {detail.foresightInsights.length > 0 && (
        <div>
          <ForesightCard insights={detail.foresightInsights} />
        </div>
      )}

      {/* Journey Graph & Sequence */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-6 shadow-sm">
        <JourneyGraph
          nodes={detail.nodes}
          dependencies={detail.dependencies}
          evidence={detail.evidence}
          onStatusChange={handleStatusChange}
        />
      </div>
    </div>
  );
}
