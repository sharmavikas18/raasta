// RAASTA Next Best Action Card ("Do This Now") — PRD §11, §19
import React from 'react';
import { NextAction } from '@/types/domain';

interface DoThisNowCardProps {
  nextAction: NextAction | null;
  onCompleteAction?: (nodeId: string) => void;
}

export const DoThisNowCard: React.FC<DoThisNowCardProps> = ({
  nextAction,
  onCompleteAction,
}) => {
  if (!nextAction) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-lg">
            ✓
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              No Immediate Blockers
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              All currently actionable prerequisites are satisfied. Monitor upcoming milestones.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isCritical = nextAction.urgency === 'CRITICAL';

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-orange-500/40 dark:border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent p-6 shadow-md shadow-orange-500/5">
      {/* Top Tag */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500 text-white text-[11px] font-extrabold tracking-wider uppercase shadow-sm">
          <span className="animate-pulse">●</span>
          <span>Do This Now</span>
        </div>
        {nextAction.blocksCount > 0 && (
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-900/50">
            Blocks {nextAction.blocksCount} downstream {nextAction.blocksCount === 1 ? 'step' : 'steps'}
          </span>
        )}
      </div>

      {/* Main Action Instruction */}
      <h3 className="text-lg md:text-xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight leading-snug">
        {nextAction.title}
      </h3>

      {/* Explanation Reason */}
      <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-2 font-medium leading-relaxed">
        {nextAction.reason}
      </p>

      {/* Action Row */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {onCompleteAction && (
          <button
            type="button"
            onClick={() => onCompleteAction(nextAction.nodeId)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 text-xs font-bold shadow transition-transform active:scale-95"
          >
            <span>Mark as Completed</span>
            <span>✓</span>
          </button>
        )}
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Ranked #1 highest impact by deterministic foresight engine
        </span>
      </div>
    </div>
  );
};
