'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useMyCompanies } from '@/query/companies';
import { getActiveCompanyClient, setActiveCompanyClient } from '@/lib/active-company';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * The switcher represents the COMPANY, so it shows the company logo/avatar
 * (set in Company settings), falling back to the company initials. The member's
 * personal profile avatar is shown on the company pages, not here.
 */
function companyImage(m: {
  company: { logoUrl: string | null; avatarUrl: string | null };
}): string | undefined {
  return m.company.logoUrl ?? m.company.avatarUrl ?? undefined;
}

export function CompanySwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: memberships = [], isLoading } = useMyCompanies();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // The URL is the source of truth on company routes; else fall back to the cookie.
  useEffect(() => {
    const fromUrl = pathname.match(/^\/companies\/([^/]+)/)?.[1];
    if (fromUrl) {
      setActiveSlug(decodeURIComponent(fromUrl));
      setActiveCompanyClient(decodeURIComponent(fromUrl));
    } else {
      setActiveSlug(getActiveCompanyClient());
    }
  }, [pathname]);

  // If we have memberships but no active slug (or it points at a company the
  // user no longer belongs to), fall back to the first membership.
  useEffect(() => {
    if (memberships.length === 0) return;
    const validSlugs = new Set(memberships.map((m) => m.company.slug));
    if (!activeSlug || !validSlugs.has(activeSlug)) {
      const next = memberships[0].company.slug;
      setActiveSlug(next);
      setActiveCompanyClient(next);
    }
  }, [memberships, activeSlug]);

  function handlePick(slug: string) {
    setActiveSlug(slug);
    setActiveCompanyClient(slug);
    router.push(`/companies/${slug}`);
  }

  function handleCreate() {
    router.push('/onboarding');
  }

  const active = memberships.find((m) => m.company.slug === activeSlug) ?? memberships[0];

  if (isLoading || !active) {
    return (
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
        <div className="h-7 w-7 rounded-md bg-muted animate-pulse" />
        <div className="hidden sm:block h-3 w-20 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors outline-none" />
        }
      >
        <Avatar className="h-7 w-7 rounded-md">
          <AvatarImage src={companyImage(active)} />
          <AvatarFallback className="rounded-md bg-primary/10 text-primary text-[10px] font-semibold">
            {initials(active.company.name)}
          </AvatarFallback>
        </Avatar>
        <div className="text-left hidden sm:block">
          <p className="text-xs font-semibold text-foreground leading-none truncate max-w-[140px]">
            {active.company.name}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-none capitalize">
            {active.profile.role}
          </p>
        </div>
        <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64" sideOffset={4}>
        <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          Your companies
        </div>
        {memberships.map((m) => (
          <DropdownMenuItem
            key={m.company.id}
            onClick={() => handlePick(m.company.slug)}
            className="flex items-center gap-2"
          >
            <Avatar className="h-6 w-6 rounded-md shrink-0">
              <AvatarImage src={companyImage(m)} />
              <AvatarFallback className="rounded-md bg-muted text-muted-foreground text-[10px] font-semibold">
                {initials(m.company.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{m.company.name}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{m.profile.role}</p>
            </div>
            {m.company.slug === activeSlug && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create a company
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
