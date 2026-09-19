// RAASTA Journey Card Component for Dashboard & List — PRD §6, §19
import React from 'react';
import Link from 'next/link';
import { Journey } from '@/types/domain';
import { Icon } from '@/components/ui/Icon';

interface JourneyCardProps {
  journey: Journey;
  blockersCount?: number;
  unknownsCount?: number;
}

export const JourneyCard: React.FC<JourneyCardProps> = ({
  journey,
  blockersCount = 0,
  unknownsCount = 0,
}) => {
  const percent = journey.readinessPercent;

  return (
    <Link
      href={`/journeys/${journey.id}`}
      className="group block p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md hover:border-orange-500/40 dark:hover:border-orange-500/30 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {journey.category}
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                journey.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}
            >
              {journey.status}
            </span>
          </div>

          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mt-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
            {journey.title}
          </h3>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
            {journey.originalIntent}
          </p>
        </div>

        {/* Readiness Meter Pill */}
        <div className="text-right shrink-0">
          {percent !== null ? (
            <div className="inline-flex flex-col items-end">
              <span className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                {percent}%
              </span>
              <span className="text-[10px] uppercase font-bold text-zinc-400">Readiness</span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-zinc-400">Draft</span>
          )}
        </div>
      </div>

      {/* Footer Details */}
      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-3">
          {blockersCount > 0 ? (
            <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
              <Icon name="warning" size={14} />
              <span>{blockersCount} {blockersCount === 1 ? 'blocker' : 'blockers'}</span>
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">No blockers</span>
          )}

          {unknownsCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              {unknownsCount} {unknownsCount === 1 ? 'unknown' : 'unknowns'}
            </span>
          )}
        </div>

        <div>
          {journey.deadline ? (
            <span>
              Target: <strong>{new Date(journey.deadline).toLocaleDateString()}</strong>
            </span>
          ) : (
            <span>Updated {new Date(journey.updatedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </Link>
  );
};
