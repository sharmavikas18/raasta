// RAASTA Accessibility Profile Settings Component — PRD §6, §7 Flow 3, §24
'use client';

import React from 'react';
import { UserProfileConstraint, ConstraintType } from '@/types/domain';

interface AccessibilityProfileProps {
  preferences: UserProfileConstraint[];
  onToggle: (type: ConstraintType, enabled: boolean) => void;
  isSaving?: boolean;
}

const PREF_DESCRIPTIONS: Record<
  ConstraintType,
  { title: string; desc: string; icon: string; impact: string }
> = {
  STEP_FREE: {
    title: 'Step-Free / Ramp & Elevator Route',
    desc: 'Prefers routes without stairs, escalators without level alternatives, or unpaved curbs.',
    icon: '♿',
    impact: 'Flags unverified station ramps, venue elevators, and curb cuts as explicit UNKNOWNS.',
  },
  VISUAL_ASSISTANCE: {
    title: 'Visual Accessibility Assistance',
    desc: 'Prefers audio announcements, high-contrast digital schedules, and wayfinding staff guidance.',
    icon: '👁',
    impact: 'Adds verification tasks for screen-reader friendly programs and guided venue tours.',
  },
  HEARING_COMMUNICATION: {
    title: 'Hearing / Assistive Communication',
    desc: 'Prefers real-time captions (CART), induction audio loops, and visual emergency alerts.',
    icon: '🦻',
    impact: 'Checks conference session halls for live transcription and audio loop infrastructure.',
  },
  REDUCED_WALKING: {
    title: 'Reduced Walking / Lower Physical Strain',
    desc: 'Prefers shortest walking distance from transit drop-off and guaranteed seating intervals.',
    icon: '🚶',
    impact: 'Audits walking distances between transit gates and hall entrances before booking.',
  },
};

export const AccessibilityProfile: React.FC<AccessibilityProfileProps> = ({
  preferences,
  onToggle,
  isSaving = false,
}) => {
  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xl">♿</span>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Personal Accessibility Preferences
          </h2>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
          RAASTA adapts your journeys to ensure no accessibility surprise occurs on arrival.
          We never infer or classify medical conditions—these are your user-controlled settings.
        </p>
      </div>

      <div className="space-y-4">
        {(Object.keys(PREF_DESCRIPTIONS) as ConstraintType[]).map((type) => {
          const info = PREF_DESCRIPTIONS[type];
          const pref = preferences.find((p) => p.constraintType === type);
          const isEnabled = pref?.enabled ?? false;

          return (
            <div
              key={type}
              className={`p-4 rounded-xl border transition-all ${
                isEnabled
                  ? 'border-orange-500/40 bg-orange-500/5 dark:bg-orange-500/10'
                  : 'border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5" role="img" aria-hidden="true">
                    {info.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                      {info.title}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                      {info.desc}
                    </p>
                    <p className="text-[11px] text-orange-700 dark:text-orange-300 font-medium mt-1.5 flex items-center gap-1">
                      <span>✦ Effect:</span>
                      <span>{info.impact}</span>
                    </p>
                  </div>
                </div>

                {/* Switch Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  disabled={isSaving}
                  onClick={() => onToggle(type, !isEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                    isEnabled ? 'bg-orange-600' : 'bg-zinc-300 dark:bg-zinc-700'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="sr-only">Toggle {info.title}</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
        <span>Non-negotiable rule: No accessibility facts are ever fabricated.</span>
        {isSaving && <span className="text-orange-500 font-semibold animate-pulse">Updating...</span>}
      </div>
    </div>
  );
};
