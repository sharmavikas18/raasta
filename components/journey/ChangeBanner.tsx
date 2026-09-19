// RAASTA Change Alert Banner Component — PRD §7 Flow 4, §19
import React from 'react';
import { ChangeEvent } from '@/types/domain';

interface ChangeBannerProps {
  changeEvent: ChangeEvent | null;
  onDismiss?: () => void;
}

export const ChangeBanner: React.FC<ChangeBannerProps> = ({
  changeEvent,
  onDismiss,
}) => {
  if (!changeEvent) return null;

  return (
    <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent p-5 shadow-lg shadow-amber-500/5 relative animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">⚠️</span>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider">
              <span>Journey Change Detected</span>
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mt-1">
              {changeEvent.changeType.replace(/_/g, ' ')}: {changeEvent.oldValue} →{' '}
              <span className="underline decoration-amber-500 underline-offset-2">
                {changeEvent.newValue}
              </span>
            </h3>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xs"
            aria-label="Dismiss change banner"
          >
            ✕
          </button>
        )}
      </div>

      {/* Downstream Impact List */}
      {changeEvent.impact.length > 0 && (
        <div className="mt-3.5 pt-3 border-t border-amber-500/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 block mb-1.5">
            Downstream Impact:
          </span>
          <ul className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
            {changeEvent.impact.map((msg, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>{msg}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Trust State Disclaimer */}
      <div className="mt-3 pt-2 text-[11px] text-zinc-500 dark:text-zinc-400 italic">
        Source: {changeEvent.source} ({new Date(changeEvent.createdAt).toLocaleTimeString()})
      </div>
    </div>
  );
};
