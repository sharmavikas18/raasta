import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'RAASTA — Real-world Awareness, Action, Sequencing & Timing Assistant',
  description:
    'Know before you need to know. AI-powered real-world goal engine that turns intent into a dependency-aware, deadline-aware journey.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
