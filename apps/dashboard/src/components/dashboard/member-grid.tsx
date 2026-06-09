'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

function initials(name: string) {
  return (
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );
}

export interface MemberGridItem {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  role?: string | null;
  subtitle?: string | null;
}

/** Grid of member cards; each links to that member's company profile. */
export function MemberGrid({ slug, members }: { slug: string; members: MemberGridItem[] }) {
  if (members.length === 0) {
    return <p className="text-muted-foreground text-sm">No members yet.</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((m) => (
        <Link
          key={m.profileId}
          href={`/companies/${slug}/members/${m.profileId}`}
          className="bg-card hover:border-primary/40 flex items-center gap-3 rounded-xl border p-3 transition-colors"
        >
          <Avatar className="size-10 shrink-0">
            <AvatarImage src={m.avatarUrl ?? undefined} alt={m.displayName} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initials(m.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm font-medium">{m.displayName}</p>
            {m.subtitle && <p className="text-muted-foreground truncate text-xs">{m.subtitle}</p>}
          </div>
          {m.role && (
            <Badge variant="muted" className="capitalize">
              {m.role}
            </Badge>
          )}
        </Link>
      ))}
    </div>
  );
}
