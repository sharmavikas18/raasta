// RAASTA Readiness Card — PRD §10, §19
import React from 'react';
import { ReadinessResult } from '@/types/domain';
import { getReadinessDescription } from '@/lib/readiness/engine';

interface ReadinessCardProps {
  readiness: ReadinessResult;
}

export const ReadinessCard: React.FC<ReadinessCardProps> = ({ readiness }) => {
  const description = getReadinessDescription(readiness);
  const percent = readiness.percent;

  // Ring stroke calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    percent !== null ? circumference - (percent / 100) * circumference : circumference;

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
            Journey Readiness
          </span>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">
            {description}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {readiness.completedRequired} of {readiness.totalRequired} required conditions satisfied
          </p>
        </div>

        {/* Circular Progress Gauge */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="w-24 h-24 transform -rotate-90" aria-hidden="true">
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="currentColor"
              strokeWidth="7"
              className="text-zinc-100 dark:text-zinc-800"
              fill="transparent"
            />
            {percent !== null && (
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="currentColor"
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`transition-all duration-700 ${
                  percent >= 75
                    ? 'text-emerald-500'
                    : percent >= 45
                    ? 'text-amber-500'
                    : 'text-orange-500'
                }`}
                fill="transparent"
              />
            )}
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            {percent !== null ? (
              <>
                <span className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {percent}%
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 -mt-1 font-medium">
                  READY
                </span>
              </>
            ) : (
              <span className="text-xs font-semibold text-zinc-500 px-2">Draft</span>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/50 dark:border-zinc-800/50">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              readiness.blockerCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
          />
          <div>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {readiness.blockerCount}
            </span>{' '}
            <span className="text-zinc-500 dark:text-zinc-400">
              {readiness.blockerCount === 1 ? 'Blocker' : 'Blockers'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/50 dark:border-zinc-800/50">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              readiness.criticalUnknowns > 0 ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
          />
          <div>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {readiness.criticalUnknowns}
            </span>{' '}
            <span className="text-zinc-500 dark:text-zinc-400">
              {readiness.criticalUnknowns === 1 ? 'Unknown' : 'Unknowns'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
