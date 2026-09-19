// RAASTA Journey Node Card Component — PRD §8, §9, §19
import React from 'react';
import { JourneyNode, Evidence, NodeStatus } from '@/types/domain';
import { EvidenceBadge } from '@/components/ui/EvidenceBadge';

interface JourneyNodeCardProps {
  node: JourneyNode;
  evidence?: Evidence[];
  onStatusChange?: (nodeId: string, newStatus: NodeStatus) => void;
}

const STATUS_STYLE: Record<
  NodeStatus,
  { label: string; badgeBg: string; badgeText: string; icon: string; border: string }
> = {
  COMPLETED: {
    label: 'Completed',
    badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    icon: '✓',
    border: 'border-emerald-500/30 dark:border-emerald-500/20',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badgeBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    badgeText: 'text-blue-700 dark:text-blue-300',
    icon: '◉',
    border: 'border-blue-500/30 dark:border-blue-500/20',
  },
  BLOCKED: {
    label: 'Blocked',
    badgeBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
    badgeText: 'text-rose-700 dark:text-rose-300',
    icon: '⚠',
    border: 'border-rose-500/40 dark:border-rose-500/30',
  },
  NEEDS_VERIFICATION: {
    label: 'Needs Verification',
    badgeBg: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20',
    badgeText: 'text-amber-800 dark:text-amber-300',
    icon: '?',
    border: 'border-amber-500/30 dark:border-amber-500/20',
  },
  NOT_STARTED: {
    label: 'Upcoming',
    badgeBg: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
    badgeText: 'text-zinc-600 dark:text-zinc-400',
    icon: '○',
    border: 'border-zinc-200 dark:border-zinc-800',
  },
  NOT_APPLICABLE: {
    label: 'Not Applicable',
    badgeBg: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700',
    badgeText: 'text-zinc-400',
    icon: '–',
    border: 'border-zinc-200/60 dark:border-zinc-800/60 opacity-60',
  },
};

const TYPE_ICONS: Record<string, string> = {
  DOCUMENT: '📄',
  VERIFICATION: '🔍',
  BOOKING: '✈',
  REGISTRATION: '📝',
  ACCESSIBILITY: '♿',
  PREPARATION: '⚙',
  DEADLINE: '⏱',
  TASK: '◻',
};

export const JourneyNodeCard: React.FC<JourneyNodeCardProps> = ({
  node,
  evidence = [],
  onStatusChange,
}) => {
  const statusCfg = STATUS_STYLE[node.status] || STATUS_STYLE.NOT_STARTED;
  const typeIcon = TYPE_ICONS[node.type] || '◻';

  return (
    <div
      className={`rounded-2xl border ${statusCfg.border} bg-white dark:bg-zinc-900 p-5 shadow-sm transition-all hover:shadow-md relative`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl" role="img" aria-label={node.type}>
            {typeIcon}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {node.type}
              </span>
              {node.isRequired && (
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.2 rounded font-semibold">
                  Required
                </span>
              )}
            </div>
            <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">
              {node.title}
            </h4>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.badgeBg}`}
        >
          <span>{statusCfg.icon}</span>
          <span>{statusCfg.label}</span>
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2.5 leading-relaxed">
        {node.description}
      </p>

      {/* Blocker Alert Box if Blocked */}
      {node.status === 'BLOCKED' && node.blockedReason && (
        <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300">
          <span className="font-bold block mb-0.5">⚠ Blocked Condition:</span>
          {node.blockedReason}
        </div>
      )}

      {/* Next Action Callout */}
      {node.nextAction && node.status !== 'COMPLETED' && (
        <div className="mt-3 p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 text-xs text-amber-900 dark:text-amber-200">
          <span className="font-bold text-[11px] uppercase tracking-wide block text-amber-700 dark:text-amber-400">
            Immediate Action
          </span>
          <span className="mt-0.5 block">{node.nextAction}</span>
        </div>
      )}

      {/* Evidence & Sources Section */}
      {evidence.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Evidence & Verification State
          </span>
          <div className="flex flex-wrap gap-2">
            {evidence.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-1.5 p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 text-[11px]"
              >
                <EvidenceBadge state={ev.verificationState} />
                <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate max-w-[200px]" title={ev.referenceText}>
                  {ev.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer / Controls */}
      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
        <div className="text-zinc-500 dark:text-zinc-400">
          {node.dueAt ? (
            <span>
              Due:{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">
                {new Date(node.dueAt).toLocaleDateString()}
              </strong>
            </span>
          ) : (
            <span className="text-zinc-400">No fixed deadline</span>
          )}
        </div>

        {/* Quick status transitions */}
        {onStatusChange && (
          <div className="flex items-center gap-1.5">
            {node.status !== 'COMPLETED' ? (
              <button
                type="button"
                onClick={() => onStatusChange(node.id, 'COMPLETED')}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-sm transition-transform active:scale-95"
              >
                Mark Done ✓
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onStatusChange(node.id, 'IN_PROGRESS')}
                className="px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-[11px]"
              >
                Reopen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
