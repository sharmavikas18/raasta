// RAASTA Evidence & Verification State Badge — PRD §9, §17, §19
// Visually distinguishes verified, inferred, community, stale, and unknown facts.

import React from 'react';
import { VerificationState } from '@/types/domain';
import { Icon, IconName } from '@/components/ui/Icon';

interface EvidenceBadgeProps {
  state: VerificationState;
  className?: string;
  showIcon?: boolean;
}

const STATE_CONFIG: Record<
  VerificationState,
  { label: string; bg: string; text: string; border: string; icon: IconName }
> = {
  VERIFIED_OFFICIAL: {
    label: 'Verified Official',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/30',
    icon: 'check',
  },
  VERIFIED_USER: {
    label: 'User Confirmed',
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-500/30',
    icon: 'user',
  },
  COMMUNITY_REPORTED: {
    label: 'Community Reported',
    bg: 'bg-purple-500/10 dark:bg-purple-500/15',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-500/30',
    icon: 'users',
  },
  AI_INFERRED: {
    label: 'AI Inferred',
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-500/30',
    icon: 'spark',
  },
  UNKNOWN: {
    label: 'Unknown',
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/30',
    icon: 'warning',
  },
  STALE: {
    label: 'Stale Info',
    bg: 'bg-zinc-500/10 dark:bg-zinc-500/15',
    text: 'text-zinc-700 dark:text-zinc-400',
    border: 'border-zinc-500/30',
    icon: 'clock',
  },
};

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({
  state,
  className = '',
  showIcon = true,
}) => {
  const config = STATE_CONFIG[state] || STATE_CONFIG.UNKNOWN;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
      title={`Trust state: ${config.label}`}
    >
      {showIcon && <Icon name={config.icon} size={13} />}
      <span>{config.label}</span>
    </span>
  );
};
