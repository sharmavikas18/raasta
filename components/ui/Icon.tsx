import React from 'react';

export type IconName = 'upload' | 'bell' | 'clock' | 'pin' | 'arrow' | 'check' | 'warning' | 'spark' | 'calendar' | 'file' | 'accessibility' | 'eye' | 'ear' | 'walk' | 'zap' | 'menu' | 'user' | 'users' | 'search' | 'edit' | 'settings';

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    upload: <><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 20h16"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    clock: <><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></>,
    pin: <><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></>,
    arrow: <><path d="M4 12h15"/><path d="m13 6 6 6-6 6"/></>,
    check: <><circle cx="12" cy="12" r="8"/><path d="m8 12 3 3 5-6"/></>,
    warning: <><path d="m12 4 8 15H4L12 4Z"/><path d="M12 9v4"/><path d="M12 16h.01"/></>,
    spark: <><path d="m12 3 1.2 5.8L19 10l-5.8 1.2L12 17l-1.2-5.8L5 10l5.8-1.2L12 3Z"/></>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></>,
    file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
    accessibility: <><circle cx="12" cy="4" r="2"/><path d="M5 8h14M12 8v12M8 20l4-6 4 6M8 12l-3 5M16 12l3 5"/></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
    ear: <><path d="M18 14c0 3-2 5-5 5-2 0-3-1-3-3 0-2 2-3 2-6 0-2-1-3-3-3-2 0-4 2-4 5"/><path d="M5 7c1-2 3-3 5-3 4 0 7 3 7 7"/></>,
    walk: <><circle cx="13" cy="4" r="2"/><path d="m12 7-2 5 4 2 2 6M10 12l-5 4M12 14l-4 6"/></>,
    zap: <><path d="m13 2-9 12h7l-1 8 9-12h-7z"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    user: <><circle cx="12" cy="8" r="3"/><path d="M5 21c.7-4 3-6 7-6s6.3 2 7 6"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M2 21c.6-4 2.8-6 7-6"/><path d="M15 5a3 3 0 0 1 0 6M15 15c3 .2 5 2 5.5 5"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6"/><path d="m16 16 5 5"/></>,
    edit: <><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10z"/><path d="m14 7 3 3"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5L9 6a8 8 0 0 0-1.7 1l-2.4-1-2 3.5L5 11a7 7 0 0 0 0 2l-2.1 1.5 2 3.5 2.4-1a8 8 0 0 0 1.7 1l.5 3h5l.5-3a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
