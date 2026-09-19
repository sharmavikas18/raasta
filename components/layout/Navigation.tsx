'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { name: 'Home', href: '/' },
  { name: 'Journeys', href: '/journeys' },
  { name: 'Documents', href: '/documents' },
  { name: 'Profile', href: '/profile' },
];

export function Navigation() {
  const pathname = usePathname();
  return (
    <header className="raasta-nav" aria-label="Main navigation">
      <Link href="/" className="raasta-logo"><span className="raasta-mark">R</span><span>RAASTA</span></Link>
      <nav className="raasta-navlinks" aria-label="Primary links">
        {links.map((link) => {
          const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          return <Link key={link.href} href={link.href} className={active ? 'active' : ''}>{link.name}</Link>;
        })}
      </nav>
      <Link href="/journeys/new" className="sketch-button">Create journey →</Link>
    </header>
  );
}
