// RAASTA Create Journey Page — PRD §6, §7 Flow 1, AT-01, AT-02
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClarifyingQuestion } from '@/types/domain';

const SCENARIO_TEMPLATES = [
  {
    title: 'Delhi Tech Conference 2026',
    category: 'EVENT',
    intent: 'I am attending the India AI & Cloud Summit in Delhi next month and need to manage registration, transit, accommodation, and venue arrival.',
    icon: '🏢',
  },
  {
    title: 'STEM Research Fellowship',
    category: 'SCHOLARSHIP',
    intent: 'Apply for the National Merit STEM Research Scholarship, prepare revenue income certificate, dean recommendation, and complete portal KYC before deadline.',
    icon: '🎓',
  },
  {
    title: 'International Academic Exchange',
    category: 'TRAVEL',
    intent: 'Plan my 3-month research visit to Singapore, including visa processing, university clearance, travel insurance, and hostel booking.',
    icon: '✈',
  },
];

export const PROCESSING_MESSAGES = [
  'Understanding your goal with Bedrock reasoning...',
  'Structuring prerequisites and time dependencies...',
  'Scanning for missing dependencies & blind spots...',
  'Calibrating readiness and selecting top next action...',
];

export default function CreateJourneyPage() {
  const router = useRouter();
  const [intent, setIntent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[]>([]);
  const [createdJourneyId, setCreatedJourneyId] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent, customIntent?: string) => {
    if (e) e.preventDefault();
    const finalIntent = customIntent || intent;
    if (!finalIntent.trim()) {
      setError('Please provide a goal description to begin.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setProcessStep(0);

    // Progress message ticker (honest state, not fake percentages)
    const interval = setInterval(() => {
      setProcessStep((prev) => (prev < PROCESSING_MESSAGES.length - 1 ? prev + 1 : prev));
    }, 900);

    try {
      const res = await fetch('/api/journeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: finalIntent }),
      });

      clearInterval(interval);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create journey.');
      }

      const result = await res.json();

      if (result.clarifyingQuestions && result.clarifyingQuestions.length > 0) {
        setClarifyingQuestions(result.clarifyingQuestions);
        setCreatedJourneyId(result.journeyId);
      } else {
        router.push(`/journeys/${result.journeyId}`);
      }
    } catch (err: any) {
      clearInterval(interval);
      setError(err?.message || 'Journey creation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
          ● New Goal Journey
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight mt-1">
          What are you trying to accomplish?
        </h1>
        <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Tell RAASTA your real-world intent. We discover the required journey, dependencies, deadlines, and unknowns.
        </p>
      </div>

      {/* Main Intent Input Form */}
      <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
        <div className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 focus-within:border-orange-500/60 dark:focus-within:border-orange-500/60 bg-white dark:bg-zinc-900 p-4 transition-all shadow-sm">
          <textarea
            rows={4}
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            disabled={isSubmitting}
            placeholder="e.g. I want to attend a tech conference in Delhi next week..."
            className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-sm md:text-base text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 resize-none"
            aria-label="Real-world goal intent"
          />

          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              Deterministic engine + Amazon Bedrock reasoning
            </span>
            <button
              type="submit"
              disabled={isSubmitting || !intent.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all active:scale-95"
            >
              <span>Build Journey</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}
      </form>

      {/* Processing State with Honest Status Messages (PRD §35) */}
      {isSubmitting && (
        <div className="p-6 rounded-2xl border border-orange-500/30 bg-orange-500/5 text-center space-y-3 animate-in fade-in duration-300">
          <div className="h-8 w-8 mx-auto rounded-full border-2 border-orange-600 border-t-transparent animate-spin" />
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            {PROCESSING_MESSAGES[processStep]}
          </h3>
          <p className="text-xs text-zinc-500">
            Mapping candidate tasks, dependencies, and missing context...
          </p>
        </div>
      )}

      {/* High-Value Clarifying Questions Modal/Section (AT-02) */}
      {clarifyingQuestions.length > 0 && createdJourneyId && (
        <div className="p-6 rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <span className="text-xl">✦</span>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                “What Am I Not Asking?” — High-Value Context
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                RAASTA detected high-impact missing details that could materially alter your deadlines or route.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {clarifyingQuestions.map((q, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{q.question}</span>
                  <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                    Impact: {q.impact}
                  </span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400">{q.whyItMatters}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => router.push(`/journeys/${createdJourneyId}`)}
              className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold shadow hover:opacity-90"
            >
              Proceed to Journey Graph →
            </button>
          </div>
        </div>
      )}

      {/* Scenario Templates */}
      <div className="space-y-3 pt-4">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Or Select a Test Scenario Template (PRD §2)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SCENARIO_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.title}
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setIntent(tmpl.intent);
                handleSubmit(undefined, tmpl.intent);
              }}
              className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-left hover:border-orange-500/50 hover:shadow-sm transition-all group"
            >
              <span className="text-2xl block mb-2">{tmpl.icon}</span>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-orange-600 dark:group-hover:text-orange-400">
                {tmpl.title}
              </h3>
              <p className="text-[11px] text-zinc-500 line-clamp-2 mt-1">
                {tmpl.intent}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
