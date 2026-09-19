// RAASTA Profile & Accessibility Settings Page — PRD §6, §7 Flow 3, AT-06
'use client';

import React, { useEffect, useState } from 'react';
import { User, ConstraintType } from '@/types/domain';
import { AccessibilityProfile } from '@/components/accessibility/AccessibilityProfile';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleToggleConstraint = async (type: ConstraintType, enabled: boolean) => {
    setIsSaving(true);
    setNotice(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          constraintType: type,
          enabled,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setNotice(
          `Accessibility preference "${type}" ${
            enabled ? 'enabled' : 'disabled'
          }. All active journeys automatically updated.`
        );
      }
    } catch (err) {
      console.error('Failed to update accessibility preference:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-zinc-500 animate-pulse">
        Loading profile & accessibility settings...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4 profile-page">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
          ● User Context & Preferences
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight mt-1">
          Profile & Accessibility
        </h1>
        <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Control your accessibility constraints and journey notification preferences.
        </p>
      </div>

      {notice && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-in fade-in">
          <span>✓ {notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-emerald-600 font-bold ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* User Info Overview */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-blue-500/20">
            AP
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {user?.name || 'Aarav Patel'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Target Persona: Student & Event Attendee · Demo Account
            </p>
          </div>
        </div>
      </div>

      {/* Accessibility Preferences Component */}
      {user && (
        <AccessibilityProfile
          preferences={user.accessibilityPreferences}
          onToggle={handleToggleConstraint}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
