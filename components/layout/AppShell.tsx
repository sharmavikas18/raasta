// RAASTA App Shell Layout Component — PRD §6, §19, §21
'use client';

import React from 'react';
import { Navigation } from './Navigation';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="notebook-shell">
      <Navigation />
      <main className="notebook-main">{children}</main>
    </div>
  );
};
