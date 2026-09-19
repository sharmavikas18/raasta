// RAASTA Foresight Insights Card Component — PRD §12, §19
import React from 'react';
import { ForesightInsight } from '@/types/domain';

interface ForesightCardProps {
  insights: ForesightInsight[];
}

const SEVERITY_CONFIG = {
  CRITICAL: {
    badge: 'bg-rose-500 text-white',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/5',
    icon: '⚡',
  },
  HIGH: {
    badge: 'bg-amber-500 text-white',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    icon: '⚠',
  },
  MEDIUM: {
    badge: 'bg-blue-500 text-white',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    icon: 'ℹ',
  },
  LOW: {
    badge: 'bg-zinc-500 text-white',
    border: 'border-zinc-500/30',
    bg: 'bg-zinc-500/5',
    icon: '•',
  },
};

export const ForesightCard: React.FC<ForesightCardProps> = ({ insights }) => {
  if (insights.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 text-lg">✦</span>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            Foresight & Surprise Prevention
          </h3>
        </div>
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
          {insights.length} {insights.length === 1 ? 'Insight' : 'Insights'} Detected
        </span>
      </div>

      <div className="space-y-3">
        {insights.map((item) => {
          const cfg = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.MEDIUM;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border ${cfg.border} ${cfg.bg} space-y-2`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <span>{cfg.icon}</span>
                  <span>{item.title}</span>
                </span>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${cfg.badge}`}>
                  {item.severity}
                </span>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {item.explanation}
              </p>

              {item.suggestedAction && (
                <div className="pt-2 mt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                    Recommended: {item.suggestedAction}
                  </span>
                  {item.verificationRequired && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      Verification required
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
