'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

/** Tabs shared across a team's sub-pages (members, projects). */
export function TeamSubnav({ slug, teamSlug }: { slug: string; teamSlug: string }) {
  const pathname = usePathname();
  const base = `/companies/${slug}/teams/${teamSlug}`;
  const tabs = [
    { href: `${base}/members`, label: 'Members' },
    { href: `${base}/projects`, label: 'Projects' },
  ];

  return (
    <nav className="flex gap-1 border-b">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
              active
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
