'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, Plus, Building2 } from 'lucide-react';
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

export function CompanySwitcher() {
  const router = useRouter();
  const { data: memberships = [], isLoading } = useMyCompanies();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // Hydrate the active slug from the cookie on mount.
  useEffect(() => {
    setActiveSlug(getActiveCompanyClient());
  }, []);

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
    router.refresh();
  }

  function handleCreate() {
    router.push('/onboarding');
  }

  const active = memberships.find((m) => m.company.slug === activeSlug) ?? memberships[0];

  if (isLoading || !active) {
    return (
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
        <div className="h-7 w-7 rounded-md bg-gray-200 animate-pulse" />
        <div className="hidden sm:block h-3 w-20 rounded bg-gray-200 animate-pulse" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors outline-none" />
        }
      >
        <Avatar className="h-7 w-7 rounded-md">
          <AvatarImage src={active.company.avatarUrl ?? undefined} />
          <AvatarFallback className="rounded-md bg-primary/10 text-primary text-[10px] font-semibold">
            {initials(active.company.name)}
          </AvatarFallback>
        </Avatar>
        <div className="text-left hidden sm:block">
          <p className="text-xs font-semibold text-gray-900 leading-none truncate max-w-[140px]">
            {active.company.name}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 leading-none capitalize">
            {active.profile.role}
          </p>
        </div>
        <ChevronsUpDown className="h-3 w-3 text-gray-400" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64" sideOffset={4}>
        <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
          Your companies
        </div>
        {memberships.map((m) => (
          <DropdownMenuItem
            key={m.company.id}
            onClick={() => handlePick(m.company.slug)}
            className="flex items-center gap-2"
          >
            <Avatar className="h-6 w-6 rounded-md shrink-0">
              <AvatarImage src={m.company.avatarUrl ?? undefined} />
              <AvatarFallback className="rounded-md bg-gray-100 text-gray-600 text-[10px] font-semibold">
                {initials(m.company.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-900 truncate">{m.company.name}</p>
              <p className="text-[10px] text-gray-400 capitalize">{m.profile.role}</p>
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
